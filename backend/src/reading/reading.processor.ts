import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingService } from './reading.service';
import { ReadingAiService } from './reading-ai.service';

@Processor('reading-generation', { concurrency: 1 })
export class ReadingProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly service: ReadingService,
    private readonly ai: ReadingAiService,
  ) {
    super();
  }
  async process(job: Job<{ articleId: number; userId: number }>) {
    const { articleId, userId } = job.data;
    const article = await this.prisma.readingArticle.findFirst({
      where: { id: articleId, ownerId: userId },
    });
    if (!article || article.status === 'READY') return;
    await this.prisma.readingArticle.update({
      where: { id: articleId },
      data: { status: 'PROCESSING' },
    });
    try {
      const questions = await this.service.aiCall(
        userId,
        'GENERATE',
        article.originalText.length,
        () => this.ai.questions(article.originalText),
      );
      await this.prisma.$transaction(async (db) => {
        const version = await db.readingVersion.create({
          data: {
            articleId,
            revision: 1,
            title: article.title,
            text: article.originalText,
            topic: 'Cá nhân',
            kind: 'ARTICLE',
            difficulty: 'MEDIUM',
            origin: 'AI',
            reviewed: false,
            questions: questions as unknown as Prisma.InputJsonValue,
          },
        });
        await db.readingArticle.update({
          where: { id: articleId },
          data: { currentVersionId: version.id, status: 'READY', error: null },
        });
      });
    } catch {
      await this.prisma.readingArticle.update({
        where: { id: articleId },
        data: {
          status: 'FAILED',
          error:
            'AI chưa tạo được câu hỏi có cấu trúc và bằng chứng hợp lệ, hoặc dịch vụ đang hết hạn mức/timeout. Hãy thử lại sau. Văn bản gốc vẫn được giữ nguyên.',
        },
      });
    }
  }
}
