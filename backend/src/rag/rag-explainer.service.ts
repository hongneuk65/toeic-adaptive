import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RagRetrieverService, RetrievedChunk } from './rag-retriever.service';
import { RagLlmService } from './rag-llm.service';

export interface PersonalizedExplanationResult {
  questionId: number;
  part: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  learnerMastery: {
    skillCode: string;
    skillName: string;
    masteryScore: number;
    levelDescription: string;
  } | null;
  explanation: string;
  sections: {
    misconceptionAnalysis: string;
    correctAnswerExplanation: string;
    keyTakeawayRule: string;
    recommendedAction: string;
  };
  retrievedSources: {
    title: string;
    category: string;
    sourceType: string;
    lessonId?: number | null;
  }[];
}

@Injectable()
export class RagExplainerService {
  private readonly logger = new Logger(RagExplainerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly retriever: RagRetrieverService,
    private readonly llm: RagLlmService,
  ) {}

  /**
   * Sinh giải thích lỗi sai cá nhân hóa kết hợp RAG + Mô hình Năng lực DAS3H
   */
  async explainError(params: {
    userId: number;
    questionId: number;
    selectedAnswer: string;
    userNote?: string;
    signal?: AbortSignal;
    onChunk?: (chunk: string) => void;
  }): Promise<PersonalizedExplanationResult> {
    params.signal?.throwIfAborted();
    const { userId, questionId, selectedAnswer, userNote } = params;

    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException(`Không tìm thấy câu hỏi với ID ${questionId}`);
    }

    const primarySkill = question.skills[0]?.skill;
    const isCorrect = selectedAnswer.toUpperCase() === question.correctAnswer.toUpperCase();

    let masteryScore = 0.5;
    params.signal?.throwIfAborted();
    const [mastery, retrievedChunks] = await Promise.all([
      primarySkill ? this.prisma.userSkillMastery.findUnique({
        where: {
          userId_skillId: {
            userId,
            skillId: primarySkill.id,
          },
        },
      }) : Promise.resolve(null),
      this.retriever.retrieveContext({
        query: `${primarySkill?.name || ''} ${primarySkill?.category || ''} ${question.content} ${selectedAnswer} ${question.correctAnswer}`,
        part: question.part,
        skillCode: primarySkill?.code,
        topK: 3,
      }),
    ]);
    if (mastery) masteryScore = mastery.masteryScore;
    params.signal?.throwIfAborted();

    let levelDescription = 'Trung cấp (Vùng phát triển ZPD)';
    let instructionTone = 'Cung cấp phân tích bẫy đề thi và quy tắc trọng tâm, phương pháp loại trừ.';

    if (masteryScore < 0.45) {
      levelDescription = 'Cơ bản / Cần củng cố gốc rễ';
      instructionTone = 'Giải thích cực kỳ cặn kẽ, phân tích từng thành phần từ loại cơ bản, dịch nghĩa tiếng Việt chi tiết câu hỏi và 4 đáp án.';
    } else if (masteryScore >= 0.7) {
      levelDescription = 'Nâng cao / Khá giỏi';
      instructionTone = 'Đi thẳng vào bẫy nâng cao (distractor nuance), mẹo tối ưu hóa thời gian xử lý câu dưới 10 giây.';
    }

    return this.generateAndFormat({
      question,
      primarySkill,
      selectedAnswer,
      isCorrect,
      masteryScore,
      levelDescription,
      instructionTone,
      retrievedChunks,
      userNote,
      signal: params.signal,
      onChunk: params.onChunk,
    });
  }

  private async generateAndFormat(params: {
    question: any;
    primarySkill: any;
    selectedAnswer: string;
    isCorrect: boolean;
    masteryScore: number;
    levelDescription: string;
    instructionTone: string;
    retrievedChunks: RetrievedChunk[];
    userNote?: string;
    signal?: AbortSignal;
    onChunk?: (chunk: string) => void;
  }): Promise<PersonalizedExplanationResult> {
    const { question, primarySkill, selectedAnswer, isCorrect, masteryScore, levelDescription, instructionTone, retrievedChunks, userNote } = params;

    const knowledgeContextText = retrievedChunks
      .map((c, idx) => `[Tài liệu ${idx + 1}: ${c.title} (${c.category})]\n${c.content}`)
      .join('\n\n');

    const systemPrompt = `Bạn là Trợ lý Sư phạm TOEIC Thông minh (Adaptive AI Tutor) chuyên phân tích lỗi sai và giải thích cá nhân hóa cho người học.
YÊU CẦU THEO TRÌNH ĐỘ HỌC VIÊN:
${instructionTone}

Trình bày rõ ràng, sư phạm, học thuật, không sử dụng icon hay emoji.
Định dạng phản hồi bắt buộc gồm 4 mục:
### 1. Phân tích nguyên nhân chọn sai và bẫy tư duy
### 2. Phân tích cặn kẽ đáp án đúng
### 3. Quy tắc cốt lõi cần ghi nhớ
### 4. Lộ trình khắc phục đề xuất`;

    const displayAnswer =
      !selectedAnswer || selectedAnswer === 'CHƯA_CHỌN'
        ? '(Chưa chọn/Bỏ trống)'
        : `(${selectedAnswer}) ${isCorrect ? '(ĐÚNG)' : '(SAI)'}`;

    const userPrompt = `CÂU HỎI THI:
- Part: ${question.part}
- Kỹ năng: ${primarySkill?.name || 'Tổng hợp'} (${primarySkill?.code || 'N/A'})
${question.passage ? `- Đoạn văn: "${question.passage}"\n` : ''}
- Đề bài: "${question.content}"
- Lựa chọn:
  (A) ${question.optionA}
  (B) ${question.optionB}
  (C) ${question.optionC}
  (D) ${question.optionD}
- Đáp án đúng: (${question.correctAnswer})
- Đáp án học viên: ${displayAnswer}
${question.explanation ? `- Giải thích có sẵn: "${question.explanation}"` : ''}
${userNote ? `- Thắc mắc của học viên: "${userNote}"` : ''}

NĂNG LỰC HỌC VIÊN (DAS3H):
- Điểm thông thạo: ${(masteryScore * 100).toFixed(1)}% (${levelDescription})

KHO TRI THỨC (RAG):
${knowledgeContextText || 'Áp dụng quy tắc ngữ pháp và chiến thuật TOEIC tiêu chuẩn.'}

Hãy viết lời giải thích chuẩn sư phạm theo cấu trúc 4 phần nêu trên, không dùng emoji hay icon. Đi thẳng vào quy tắc và ví dụ, không chép lại đề. Mỗi phần 2–4 câu, giải thích đủ bốn phần.`;

    let generatedText = '';
    try {
      for await (const chunk of this.llm.streamText({ systemPrompt, userPrompt, temperature: 0.35, maxTokens: 1800, signal: params.signal })) {
        generatedText += chunk;
        params.onChunk?.(chunk);
      }
    } catch (err: any) {
      params.signal?.throwIfAborted();
      if (params.onChunk) throw err;
      this.logger.error(`Error generating explanation: ${err.message}`);
      generatedText = 'Hệ thống đang bảo trì dịch vụ AI. Vui lòng tham khảo giải thích chuẩn của câu hỏi.';
    }

    const sections = this.extractSections(generatedText);

    return {
      questionId: question.id,
      part: question.part,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      learnerMastery: primarySkill
        ? { skillCode: primarySkill.code, skillName: primarySkill.name, masteryScore, levelDescription }
        : null,
      explanation: generatedText,
      sections,
      retrievedSources: retrievedChunks.map((c) => ({
        title: c.title,
        category: c.category,
        sourceType: c.sourceType,
        lessonId: c.lessonId,
      })),
    };
  }

  private extractSections(text: string) {
    // Regex linh hoạt: nhận diện số mục 1, 2, 3, 4 dù có '###', '**', icon hay plain text
    const s1 = this.extractPart(
      text,
      /(?:^|\n)(?:###|\*\*|\b)?\s*1\.\s*Phân tích nguyên nhân[\s\S]*?(?=(?:^|\n)(?:###|\*\*|\b)?\s*2\.\s*Phân tích|$)/i,
    );
    const s2 = this.extractPart(
      text,
      /(?:^|\n)(?:###|\*\*|\b)?\s*2\.\s*Phân tích cặn kẽ[\s\S]*?(?=(?:^|\n)(?:###|\*\*|\b)?\s*3\.\s*Quy tắc|$)/i,
    );
    const s3 = this.extractPart(
      text,
      /(?:^|\n)(?:###|\*\*|\b)?\s*3\.\s*Quy tắc cốt lõi[\s\S]*?(?=(?:^|\n)(?:###|\*\*|\b)?\s*4\.\s*Lộ trình|$)/i,
    );
    const s4 = this.extractPart(
      text,
      /(?:^|\n)(?:###|\*\*|\b)?\s*4\.\s*Lộ trình khắc phục[\s\S]*?$/i,
    );

    return {
      misconceptionAnalysis: s1.trim() || 'Cần chú ý đối chiếu kỹ cấu trúc thành phần câu và các bẫy thường gặp trong TOEIC.',
      correctAnswerExplanation: s2.trim() || text,
      keyTakeawayRule: s3.trim() || 'Xác định từ loại và cấu trúc trước và sau khoảng trống trước khi chọn đáp án.',
      recommendedAction: s4.trim() || 'Xem lại bài giảng lý thuyết tương ứng và hoàn thành các bài tập thích ứng để củng cố kỹ năng.',
    };
  }

  private extractPart(text: string, regex: RegExp): string {
    const match = text.match(regex);
    if (match && match[0]) {
      // Loại bỏ dòng tiêu đề mục (e.g. ### 1. Phân tích...)
      return match[0]
        .replace(/^(?:\s*\n)?(?:###|\*\*|\b)?\s*[0-9]\.[^\n]*\n?/i, '')
        .trim();
    }
    return '';
  }
}
