import { Injectable, Logger } from '@nestjs/common';

export interface LlmGenerateOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
  allowFallback?: boolean;
}

@Injectable()
export class RagLlmService {
  private readonly logger = new Logger(RagLlmService.name);
  private readonly unavailableUntil = new Map<string, number>();

  /**
   * Sinh nội dung qua LLM (ưu tiên Gemini / OpenAI; tự động fallback sang Heuristic sư phạm nếu offline)
   */
  async generateText(options: LlmGenerateOptions): Promise<string> {
    let text = '';
    for await (const chunk of this.streamText(options)) text += chunk;
    return text;
  }

  /**
   * Sinh nội dung theo từng chunk để phục vụ giao diện chat streaming.
   * Nếu provider không hỗ trợ/kết nối streaming được, hệ thống vẫn fallback
   * về provider còn lại hoặc bộ sinh offline ở bên dưới.
   */
  async *streamText(options: LlmGenerateOptions): AsyncGenerator<string> {
    options.signal?.throwIfAborted();
    const startedAt = Date.now();
    const deadline = startedAt + this.setting('LLM_TOTAL_TIMEOUT_MS', 45000, 1000, 120000);
    const providers = [
      { name: 'gemini', key: process.env.GEMINI_API_KEY?.trim() },
      { name: 'openai', key: process.env.OPENAI_API_KEY?.trim() },
    ];
    for (const provider of providers) {
      if (!provider.key || (this.unavailableUntil.get(provider.name) || 0) > Date.now()) continue;
      let emitted = false;
      try {
        for await (const chunk of this.streamProvider(provider.name, provider.key, options, deadline)) {
          if (!emitted) this.logger.debug(`${provider.name} first text: ${Date.now() - startedAt}ms`);
          emitted = true;
          yield chunk;
        }
        if (!emitted) throw new Error('Empty AI response');
        this.unavailableUntil.delete(provider.name);
        this.logger.debug(`${provider.name} completed: ${Date.now() - startedAt}ms`);
        return;
      } catch (error) {
        options.signal?.throwIfAborted();
        this.unavailableUntil.set(provider.name, Date.now() + 30000);
        // Never concatenate a different answer after a partially delivered response.
        if (emitted) throw error;
        this.logger.warn(`${provider.name} unavailable (${error instanceof Error ? error.message : 'unknown error'}); trying next provider or offline explanation.`);
      }
    }
    options.signal?.throwIfAborted();
    if (options.allowFallback === false) throw new Error('AI hiện không khả dụng hoặc hết hạn mức. Vui lòng thử lại sau.');
    yield this.generatePedagogicalFallback(options.systemPrompt, options.userPrompt);
  }

  private async *streamProvider(
    provider: string,
    apiKey: string,
    options: LlmGenerateOptions,
    deadline: number,
  ): AsyncGenerator<string> {
    const gemini = provider === 'gemini';
    const primaryModel = gemini
      ? process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'
      : process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
    const models = gemini ? [...new Set([primaryModel, 'gemini-2.5-flash'])] : [primaryModel];
    const { systemPrompt, userPrompt, temperature = 0.4, maxTokens = 1800 } = options;
    const controller = new AbortController();
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abort, { once: true });
    const timeout = () => controller.abort(new Error('AI response timed out'));
    const totalTimer = setTimeout(timeout, Math.max(0, deadline - Date.now()));
    let idleTimer = setTimeout(timeout, this.setting('LLM_FIRST_TOKEN_TIMEOUT_MS', 8000, 100, 60000));
    try {
      options.signal?.throwIfAborted();
      for (const model of models) {
        if (Date.now() >= deadline) throw new Error('AI response timed out');
        const body = gemini ? {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
            // Only 2.5 Flash supports disabling thinking this way (not Pro / Gemini 3).
            ...(/^gemini-2\.5-flash(?:-lite)?$/.test(model) ? {
              thinkingConfig: { thinkingBudget: this.setting('GEMINI_THINKING_BUDGET', 0, -1, 24576) },
            } : {}),
          },
        } : {
          model, temperature, max_tokens: maxTokens, stream: true,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
        };
        const response = await fetch(gemini
          ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`
          : 'https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: gemini
            ? { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }
            : { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          await response.body?.cancel();
          // A missing model can use the stable fallback; quota/auth/network errors cannot.
          if (response.status === 404 && model !== models[models.length - 1]) continue;
          throw new Error(`AI HTTP ${response.status}`);
        }
        let completed = false;
        for await (const chunk of this.readSseResponse(response, (data) => {
          const candidate = gemini ? data?.candidates?.[0] : data?.choices?.[0];
          const reason = gemini ? candidate?.finishReason : candidate?.finish_reason;
          if (reason) {
            if (reason !== 'STOP' && reason !== 'stop') throw new Error('AI response was not completed');
            completed = true;
          }
          return gemini ? candidate?.content?.parts
            ?.filter((part: { thought?: boolean; text?: string }) => !part.thought)
            .map((part: { text?: string }) => part.text || '').join('')
            : candidate?.delta?.content;
        }, () => completed)) {
          clearTimeout(idleTimer);
          idleTimer = setTimeout(timeout, this.setting('LLM_IDLE_TIMEOUT_MS', 10000, 100, 60000));
          yield chunk;
        }
        if (!completed) throw new Error('AI stream ended before completion');
        return;
      }
    } finally {
      clearTimeout(totalTimer);
      clearTimeout(idleTimer);
      options.signal?.removeEventListener('abort', abort);
      controller.abort();
    }
  }

  private setting(name: string, fallback: number, min: number, max: number): number {
    const value = process.env[name]?.trim();
    const number = value ? Number(value) : NaN;
    return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
  }

  private async *readSseResponse(
    response: Response,
    extractText: (data: any) => string | undefined,
    isComplete: () => boolean,
  ): AsyncGenerator<string> {
    if (!response.body) throw new Error('Missing AI response body');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() || '';
        if (done && buffer) lines.push(buffer);
        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') return;
          const text = this.extractSseText(line, extractText);
          if (text) yield text;
          if (isComplete()) return;
        }
        if (done) return;
      }
    } finally {
      try {
        await reader.cancel();
      } catch {
        // An aborted fetch has already closed the upstream stream.
      }
      reader.releaseLock();
    }
  }

  private extractSseText(
    line: string,
    extractText: (data: any) => string | undefined,
  ): string | undefined {
    if (!line.startsWith('data:')) return undefined;
    const rawData = line.slice(5).trim();
    if (!rawData || rawData === '[DONE]') return undefined;

    let data: any;
    try {
      data = JSON.parse(rawData);
    } catch {
      throw new Error('Invalid AI stream data');
    }
    if (data?.error) throw new Error('AI stream returned an error');
    return extractText(data);
  }

  /**
   * Bộ sinh sư phạm tích hợp động (hoạt động kể cả khi offline hoặc chưa nhập API Key)
   * Tự động phân biệt Chat trợ lý học tập vs. Giải thích lỗi sai câu hỏi đề thi
   */
  private generatePedagogicalFallback(systemPrompt: string, userPrompt: string): string {
    const isChat =
      systemPrompt.includes('AI TOEIC Tutor') ||
      userPrompt.includes('CÂU HỎI MỚI CỦA HỌC VIÊN:') ||
      systemPrompt.includes('Gia sư AI');

    if (isChat) {
      return this.generateChatFallback(userPrompt);
    }

    return this.generateExplanationFallback(userPrompt);
  }

  private generateChatFallback(userPrompt: string): string {
    const questionMatch = userPrompt.match(/CÂU HỎI MỚI CỦA HỌC VIÊN:\s*"([\s\S]*?)"/);
    const questionText = (questionMatch ? questionMatch[1] : userPrompt).trim();
    const qLower = questionText.toLowerCase();

    const ragMatch = userPrompt.match(/TRI THỨC TOEIC TRÍCH XUẤT \(RAG\):([\s\S]*?)(?=CÂU HỎI MỚI CỦA HỌC VIÊN:|$)/);
    const ragKnowledge = ragMatch ? ragMatch[1].trim() : '';

    if (qLower.includes('although') || qLower.includes('despite') || qLower.includes('in spite of')) {
      return `Chào bạn! Đây là điểm ngữ pháp trọng tâm trong TOEIC Part 5 & 6:

1. Cấu trúc ngữ pháp:
- Although / Even though / Though + Mệnh đề (Subject + Verb): Mặc dù.
  Ví dụ: Although the weather was unfavorable, the conference proceeded as planned.
- Despite / In spite of + Cụm danh từ (Noun Phrase) / V-ing: Mặc dù, bất chấp.
  Ví dụ: Despite the heavy rain, the team completed the project on time.

2. Mẹo nhận diện bẫy TOEIC:
- Nhìn ngay sau chỗ trống xem có động từ chia thì hay không:
  + Có [S + V] -> Chọn Although / Even though.
  + Chỉ có [Cụm Danh từ] hoặc [V-ing] -> Chọn Despite / In spite of.
  + Lưu ý: Tuyệt đối không dùng "Despite of" (sai ngữ pháp).`;
    }

    if (qLower.includes('lặp từ') || (qLower.includes('part 2') && qLower.includes('bẫy'))) {
      return `Chào bạn! Bẫy lặp từ (Same Word / Sound Trap) là bẫy phổ biến nhất trong TOEIC Part 2:

1. Nguyên lý hoạt động:
- Đề thi cố tình cho một từ trong phương án trả lời phát âm giống hệt (Same word) hoặc tương tự (Similar sound / Homophone) với một từ vừa xuất hiện trong câu hỏi nhằm gây nhiễu.

2. Quy tắc xử lý:
- Khoảng 80% trường hợp câu trả lời lặp lại từ trong câu hỏi là phương án bẫy. Hãy ưu tiên loại trừ các phương án này.
- Ví dụ: Hỏi "Where is the marketing meeting?" -> Phương án "Nice to meet you" là bẫy đồng âm (meeting - meet).
- Lời khuyên: Các câu trả lời gián tiếp ("I have no idea", "Let me check with Ms. Sarah") thường là đáp án đúng.`;
    }

    if (qLower.includes('rút gọn') || qLower.includes('v-ing') || qLower.includes('mệnh đề quan hệ')) {
      return `Chào bạn! Quy tắc rút gọn mệnh đề quan hệ trong Part 5 & 6:

1. Công thức cốt lõi:
- Dạng CHỦ ĐỘNG: Rút gọn về V-ing
  Ví dụ: The manager who oversees this unit -> The manager overseeing this unit.
- Dạng BỊ ĐỘNG: Rút gọn về V-ed / V3 (Quá khứ phân từ)
  Ví dụ: The report which was submitted yesterday -> The report submitted yesterday.

2. Mẹo làm bài nhanh:
- Có Tân ngữ (Danh từ/Cụm danh từ) đứng sau -> Thường là chủ động, chọn V-ing.
- Có Giới từ (by, in, at...) hoặc dấu chấm câu ngay sau -> Thường là bị động, chọn V-ed/V3.`;
    }

    if (qLower.includes('part 7') || qLower.includes('not') || qLower.includes('true')) {
      return `Chào bạn! Chiến lược làm câu hỏi Not/True trong TOEIC Part 7:

1. Chiến lược làm bài:
- Thứ tự ưu tiên: Nên làm các câu hỏi chi tiết cụ thể hoặc câu hỏi từ vựng trước để nắm thông tin bài đọc trước khi làm câu Not/True.
- Phương pháp loại trừ: Dùng kỹ thuật Scanning đối chiếu từng phương án. 3 phương án xuất hiện trong bài sẽ bị loại, phương án KHÔNG được đề cập chính là đáp án đúng.
- Lưu ý: Các lựa chọn chứa các từ khẳng định tuyệt đối (always, never, only) thường là phương án sai.`;
    }

    if (ragKnowledge && !ragKnowledge.includes('Kiến thức ngữ pháp & chiến thuật TOEIC chuẩn')) {
      return `Chào bạn! Về câu hỏi "${questionText}", tài liệu từ kho tri thức TOEIC của hệ thống như sau:

Kiến thức trọng tâm:
${ragKnowledge}

Bạn có thể vào mục Lý thuyết để xem toàn bộ bài giảng và thực hành thêm các câu hỏi liên quan.`;
    }

    return `Chào bạn! Cảm ơn bạn đã hỏi về: "${questionText}".

Hướng dẫn chung:
- Trong bài thi TOEIC, việc xác định đúng thành phần câu (Chủ ngữ - Động từ - Tân ngữ) và nhận diện các bẫy ngữ pháp của ETS là yếu tố then chốt.
- Nếu bạn có thắc mắc về một câu hỏi cụ thể trong đề thi, bạn có thể chọn "Hỏi AI Tutor câu này" ở trang Xem lại bài thi để nhận phân tích chi tiết.`;
  }

  private generateExplanationFallback(userPrompt: string): string {
    const partMatch = userPrompt.match(/Part:\s*(\d+)/);
    const part = partMatch ? partMatch[1] : '5';

    const questionMatch = userPrompt.match(/Đề bài:\s*"([\s\S]*?)"/);
    const questionContent = questionMatch ? questionMatch[1] : 'Câu hỏi TOEIC';

    const correctMatch = userPrompt.match(/Đáp án đúng:\s*\(([A-D])\)/);
    const correctOpt = correctMatch ? correctMatch[1] : 'A';

    const selectedMatch = userPrompt.match(/Đáp án học viên(?: chọn)?:\s*\(([A-D])\)/);
    const selectedOpt = selectedMatch ? selectedMatch[1] : '';

    const skillMatch = userPrompt.match(/Kỹ năng:\s*([^\n]+)/);
    const skillName = skillMatch ? skillMatch[1] : 'Ngữ pháp TOEIC';

    const isCorrect = selectedOpt && correctOpt === selectedOpt;

    return `### 1. Phân tích nguyên nhân chọn sai và bẫy tư duy
${
  isCorrect
    ? `- Bạn đã chọn chính xác phương án (${correctOpt}) cho câu hỏi thuộc phần **${skillName}** (Part ${part}). Bạn đã nắm vững cấu trúc ngữ pháp này.`
    : selectedOpt
    ? `- Bạn đã chọn phương án (${selectedOpt}), trong khi đáp án chính xác là **(${correctOpt})**.
- Nguyên nhân phổ biến: Bạn có thể đã nhầm lẫn về hình thái từ loại hoặc cấu trúc thành phần câu trong: "${questionContent}".`
    : `- Bạn chưa chọn phương án nào cho câu hỏi này. Đáp án chính xác là **(${correctOpt})**.
- Cần chú ý phân tích cấu trúc trước và sau khoảng trống trong câu: "${questionContent}".`
}

### 2. Phân tích cặn kẽ đáp án đúng
- Đáp án chính xác là (${correctOpt}): Đảm bảo tính chính xác về mặt ngữ pháp và ngữ cảnh câu trong Part ${part}.
- Căn cứ vào vị trí chỗ trống, câu cần thành phần ngữ pháp phù hợp với cấu trúc câu chuẩn trong đề thi TOEIC.
- Các phương án còn lại bị loại trừ vì sai từ loại hoặc không tương thích với chủ ngữ/động từ của câu.

### 3. Quy tắc cốt lõi cần ghi nhớ
- Đối với chủ đề ${skillName}: Luôn phân tích thành phần câu trước và sau khoảng trống để nhận diện dấu hiệu từ loại (Danh từ, Động từ, Tính từ, Trạng từ) hoặc liên từ/giới từ.
- Tránh chọn theo cảm tính; hãy dựa trên cấu trúc ngữ pháp để xử lý câu hỏi nhanh và chính xác.

### 4. Lộ trình khắc phục đề xuất
- Đọc lại bài giảng lý thuyết chuyên đề ${skillName} trong mục Lý thuyết.
- Thực hành thêm các câu cùng kỹ năng này trong chế độ Luyện tập Thích ứng để củng cố phản xạ.`;
  }
}
