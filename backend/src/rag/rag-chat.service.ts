import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { assertQuestionAnswersAccessible } from '../common/exam-answer-access';
import { PrismaService } from '../prisma/prisma.service';
import { RagRetrieverService } from './rag-retriever.service';
import { RagLlmService } from './rag-llm.service';

export interface ChatMessageResult {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

interface ChatRequestParams {
  userId: number;
  message: string;
  questionId?: number;
  skillCode?: string;
  signal?: AbortSignal;
}

interface PreparedChatPrompt {
  systemPrompt: string;
  userPrompt: string;
  contextData: string;
}

@Injectable()
export class RagChatService {
  private readonly logger = new Logger(RagChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retriever: RagRetrieverService,
    private readonly llm: RagLlmService,
  ) {}

  async handleUserMessage(params: ChatRequestParams): Promise<ChatMessageResult> {
    const { userId } = params;
    const prompt = await this.prepareChatPrompt(params);

    let reply = '';
    try {
      reply = await this.llm.generateText({
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: 0.5,
        maxTokens: 1200,
        signal: params.signal,
      });
    } catch (err: any) {
      this.logger.error(`Error generating chat response: ${err.message}`);
      reply = 'Xin chào bạn! Mình đang gặp một chút gián đoạn kết nối. Bạn hãy thử đặt lại câu hỏi ngắn hơn nhé!';
    }

    const assistantMsg = await this.prisma.aiChatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: reply,
        contextData: prompt.contextData,
      },
    });

    return {
      id: assistantMsg.id,
      role: 'assistant',
      content: assistantMsg.content,
      createdAt: assistantMsg.createdAt,
    };
  }

  async *streamUserMessage(params: ChatRequestParams): AsyncGenerator<string> {
    const { userId } = params;
    const prompt = await this.prepareChatPrompt(params);
    let reply = '';

    try {
      for await (const chunk of this.llm.streamText({
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.userPrompt,
        temperature: 0.5,
        maxTokens: 1200,
        signal: params.signal,
      })) {
        reply += chunk;
        yield chunk;
      }
    } catch (err: any) {
      params.signal?.throwIfAborted();
      this.logger.error(`Error streaming chat response: ${err.message}`);
      // Let the client mark partial answers as interrupted, not completed.
      throw err;
    }

    params.signal?.throwIfAborted();
    await this.prisma.aiChatMessage.create({
      data: {
        userId,
        role: 'assistant',
        content: reply,
        contextData: prompt.contextData,
      },
    });
  }

  private async prepareChatPrompt(params: ChatRequestParams): Promise<PreparedChatPrompt> {
    params.signal?.throwIfAborted();
    const { userId, message, questionId, skillCode } = params;
    // Even a free-form prompt must not become a tutor during a timed exam.
    const now = new Date();
    const openExam = await this.prisma.examAttempt.findFirst({ where: { userId, submittedAt: null, OR: [
      { deadlineAt: { gt: now } },
      { deadlineAt: null, startedAt: { gte: new Date(now.getTime() - 120 * 60_000) } },
    ] }, select: { id: true } });
    if (openExam) {
      throw new ForbiddenException('Nộp bài thi đang làm trước khi sử dụng gia sư AI.');
    }
    if (questionId) await assertQuestionAnswersAccessible(this.prisma, userId, [questionId]);
    let questionContext = '';
    let partForRetriever: number | undefined;

    const [q, recentHistory] = await Promise.all([
      questionId ? this.prisma.question.findUnique({
        where: { id: questionId },
      }) : Promise.resolve(null),
      this.prisma.aiChatMessage.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 4,
        select: { role: true, content: true },
      }),
    ]);
    params.signal?.throwIfAborted();
    if (q) {
      partForRetriever = q.part;
      questionContext = `\n[NGỮ CẢNH CÂU HỎI THI HIỆN TẠI (Part ${q.part})]:\n- Đề bài: "${q.content}"\n- Đáp án đúng: (${q.correctAnswer})\n- Lựa chọn: (A) ${q.optionA} | (B) ${q.optionB} | (C) ${q.optionC} | (D) ${q.optionD}`;
    }

    // Lấy lịch sử trước khi lưu câu hỏi hiện tại để không lặp lại nó trong prompt.
    const historyText = recentHistory
      .reverse()
      .map((h) => `${h.role === 'user' ? 'Học viên' : 'AI Tutor'}: ${h.content.slice(0, 2400)}`)
      .join('\n');

    const [, chunks] = await Promise.all([this.prisma.aiChatMessage.create({
      data: {
        userId,
        role: 'user',
        content: message,
        contextData: JSON.stringify({ questionId, skillCode }),
      },
    }), this.retriever.retrieveContext({
      query: `${message} ${skillCode || ''}`,
      part: partForRetriever,
      skillCode,
      topK: 3,
    })]);
    params.signal?.throwIfAborted();
    const knowledgeContext = chunks
      .map((c) => `- [${c.title}]: ${c.content}`)
      .join('\n');

    const systemPrompt = `Bạn là Gia sư AI Luyện thi TOEIC Thích ứng (AI TOEIC Tutor) sư phạm, tận tâm.
Nhiệm vụ của bạn là giải đáp thắc mắc về ngữ pháp, từ vựng, mẹo làm bài TOEIC cho học viên một cách súc tích, logic, dễ hiểu.
Trình bày học thuật, chuẩn mực, tuyệt đối không sử dụng icon hay emoji.
Hãy tận dụng kho tài liệu tri thức (RAG) được cung cấp để đưa ra lời giải chuẩn xác, có ví dụ minh họa rõ ràng. Nếu học viên hỏi về câu hỏi cụ thể, hãy phân tích dựa trên ngữ cảnh câu hỏi đó.`;

    const userPrompt = `LỊCH SỬ HỘI THOẠI GẦN ĐÂY:
${historyText || '(Bắt đầu cuộc trò chuyện mới)'}
${questionContext}

TRI THỨC TOEIC TRÍCH XUẤT (RAG):
${knowledgeContext || 'Kiến thức ngữ pháp & chiến thuật TOEIC chuẩn.'}

CÂU HỎI MỚI CỦA HỌC VIÊN:
"${message}"

Trả lời trực tiếp, dễ hiểu, không lặp lại đề bài; thường 150–250 từ và một ví dụ. Nếu học viên yêu cầu phân tích sâu, giải thích thêm nhưng không lan man. Không dùng emoji hay icon:`;

    return {
      systemPrompt,
      userPrompt,
      contextData: JSON.stringify({ questionId, skillCode }),
    };
  }

  async getChatHistory(userId: number, limit = 30): Promise<ChatMessageResult[]> {
    const records = await this.prisma.aiChatMessage.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    });

    return records.reverse().map((r) => ({
      id: r.id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      createdAt: r.createdAt,
    }));
  }

  async clearChatHistory(userId: number): Promise<{ success: boolean }> {
    await this.prisma.aiChatMessage.deleteMany({
      where: { userId },
    });
    return { success: true };
  }
}
