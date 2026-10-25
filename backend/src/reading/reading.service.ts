import { learnerExplanation } from '../common/learner-explanation';
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingAiService, redactReadingText } from './reading-ai.service';
import {
  evidenceAt,
  publicQuestions,
  ReadingQuestion,
  readingLimits,
  tutorContext,
  validateAnswers,
  validateQuestions,
} from './reading-core';
import {
  PersonalReadingDto,
  ReadingDraftDto,
  ReadingProgressDto,
  ReadingTutorDto,
  ReadingWordDto,
} from './reading.dto';

const json = (value: unknown) => value as Prisma.InputJsonValue;
@Injectable()
export class ReadingService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('reading-generation') private readonly queue: Queue,
    private readonly ai: ReadingAiService,
  ) {}
  async limit(userId: number, action: string, max: number) {
    const client = await this.queue.getBackend().client;
    client.defineCommand('readingLimit', {
      numberOfKeys: 1,
      lua: "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],86400) end; return n",
    });
    if (
      Number(
        await client.runCommand('readingLimit', [
          `reading:${userId}:${action}:${Math.floor(Date.now() / 86400000)}`,
        ]),
      ) > max
    )
      throw new HttpException(
        'Đã đạt giới hạn Reading hôm nay. Bạn vẫn có thể học bài đã lưu.',
        429,
      );
  }
  async article(userId: number, id: number) {
    const article = await this.prisma.readingArticle.findUnique({
      where: { id },
    });
    if (
      !article ||
      article.archived ||
      (article.ownerId !== userId &&
        !(article.ownerId === null && article.publishedVersionId))
    )
      throw new NotFoundException('Không tìm thấy bài đọc.');
    return article;
  }
  async version(userId: number, articleId: number) {
    const article = await this.article(userId, articleId);
    const id =
      article.ownerId === userId
        ? article.currentVersionId
        : article.publishedVersionId;
    const version = id
      ? await this.prisma.readingVersion.findFirst({ where: { id, articleId } })
      : null;
    return { article, version };
  }
  async list(userId: number) {
    const articles = await this.prisma.readingArticle.findMany({
      where: {
        archived: false,
        OR: [
          { ownerId: userId },
          { ownerId: null, publishedVersionId: { not: null } },
        ],
      },
      include: {
        versions: {
          select: {
            id: true,
            title: true,
            topic: true,
            kind: true,
            difficulty: true,
            origin: true,
            reviewed: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const attempts = await this.prisma.readingAttempt.findMany({
      where: { userId },
      select: {
        id: true,
        versionId: true,
        currentIndex: true,
        submittedAt: true,
        correct: true,
        total: true,
        tryNumber: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
    return {
      articles: articles.map(
        ({ versions, originalText: _text, ...article }) => ({
          id: article.id,
          title:
            versions.find(
              (v) =>
                v.id ===
                (article.ownerId === userId
                  ? article.currentVersionId
                  : article.publishedVersionId),
            )?.title ?? article.title,
          ownerId: article.ownerId,
          status: article.ownerId === null ? 'PUBLISHED' : article.status,
          error: article.error,
          generationAttempts: article.generationAttempts,
          version:
            versions.find(
              (v) =>
                v.id ===
                (article.ownerId === userId
                  ? article.currentVersionId
                  : article.publishedVersionId),
            ) || null,
        }),
      ),
      attempts,
      limits: readingLimits(),
    };
  }
  checkText(text: string) {
    if (!text.trim() || text.length > readingLimits().maxText)
      throw new BadRequestException(
        `Văn bản cần từ 40 từ, tối đa ${readingLimits().maxText} ký tự.`,
      );
    if (
      text.trim().split(/\s+/).length < 40 ||
      (text.match(/[A-Za-z]/g)?.length || 0) < 100
    )
      throw new BadRequestException(
        'Đoạn quá ngắn; hãy thêm văn bản tiếng Anh có đủ thông tin (ít nhất 40 từ).',
      );
  }
  async personal(userId: number, dto: PersonalReadingDto) {
    this.checkText(dto.text);
    const key = `personal:${userId}:${createHash('sha256').update(dto.text).digest('hex')}`;
    let article = await this.prisma.readingArticle.findUnique({
      where: { key },
    });
    if (!article)
      article = await this.prisma.readingArticle.upsert({
        where: { key },
        update: {},
        create: {
          key,
          ownerId: userId,
          title: dto.title.trim() || 'Bài đọc cá nhân',
          originalText: dto.text,
          status: 'FAILED',
        },
      });
    if (
      article.status === 'READY' ||
      ['CREATING', 'PROCESSING'].includes(article.status)
    )
      return { id: article.id, status: article.status };
    await this.enqueue(userId, article.id);
    return { id: article.id, status: 'CREATING' };
  }
  async enqueue(userId: number, id: number) {
    const article = await this.article(userId, id);
    if (article.ownerId !== userId) throw new ForbiddenException();
    if (article.generationAttempts >= 3)
      throw new BadRequestException(
        'Đã thử tạo 3 lần. Hãy kiểm tra nội dung hoặc dùng bài thư viện.',
      );
    if (['CREATING', 'PROCESSING'].includes(article.status)) return;
    await this.limit(userId, 'generate', readingLimits().generations);
    const claimed = await this.prisma.readingArticle.updateMany({
      where: { id, status: 'FAILED', generationAttempts: { lt: 3 } },
      data: {
        status: 'CREATING',
        error: null,
        generationAttempts: { increment: 1 },
      },
    });
    if (!claimed.count) return;
    try {
      await this.queue.add(
        'generate',
        { articleId: id, userId },
        { jobId: `reading-${id}`, removeOnComplete: true, removeOnFail: 50 },
      );
    } catch {
      await this.prisma.readingArticle.update({
        where: { id },
        data: {
          status: 'FAILED',
          error: 'Hàng đợi chưa sẵn sàng. Hãy thử lại.',
        },
      });
      throw new BadRequestException('Hàng đợi chưa sẵn sàng.');
    }
  }
  async view(userId: number, id: number) {
    const { article, version } = await this.version(userId, id);
    return {
      id,
      title: version?.title ?? article.title,
      text: version?.text ?? article.originalText,
      status: article.status,
      error: article.error,
      generationAttempts: article.generationAttempts,
      ownerId: article.ownerId,
      version: version
        ? {
            ...version,
            stimulus: await this.sourceStimulus(version),
            questions: publicQuestions(
              version.questions as unknown as ReadingQuestion[],
            ),
          }
        : null,
    };
  }
  async start(userId: number, articleId: number) {
    const { version } = await this.version(userId, articleId);
    if (!version)
      throw new BadRequestException('Bài đang tạo hoặc chưa có câu hỏi.');
    const activeKey = `${userId}:${articleId}`;
    const existing = await this.prisma.readingAttempt.findUnique({
      where: { activeKey },
    });
    if (existing) return this.attempt(userId, existing.id);
    const result = await this.prisma.$transaction(async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(${userId}::integer, ${articleId}::integer)`;
      const active = await db.readingAttempt.findUnique({
        where: { activeKey },
      });
      if (active) return active;
      const last = await db.readingAttempt.aggregate({
        where: { userId, versionId: version.id },
        _max: { tryNumber: true },
      });
      return db.readingAttempt.create({
        data: {
          userId,
          versionId: version.id,
          tryNumber: (last._max.tryNumber || 0) + 1,
          activeKey,
        },
      });
    });
    return this.attempt(userId, result.id);
  }
  async ownedAttempt(userId: number, id: number) {
    const attempt = await this.prisma.readingAttempt.findFirst({
      where: { id, userId },
      include: { version: true },
    });
    if (!attempt) throw new NotFoundException('Không tìm thấy lần học.');
    // History belongs to the student even after a system article is archived.
    return attempt;
  }
  async attempt(userId: number, id: number) {
    const attempt = await this.ownedAttempt(userId, id);
    const questions = attempt.version.questions as unknown as ReadingQuestion[];
    return {
      ...attempt,
      version: {
        ...attempt.version,
        stimulus: await this.sourceStimulus(attempt.version),
        questions: attempt.submittedAt ? questions.map(question => ({ ...question, explanation: learnerExplanation(question.explanation) })) : publicQuestions(questions),
      },
      evidenceNote:
        'Bằng chứng được lưu riêng, không cộng/trừ điểm trắc nghiệm.',
    };
  }
  async sourceStimulus(version: { origin: string; text: string }) {
    if (version.origin !== 'CRAWL') return null;
    // Reuse only presentation belonging to the exact unchanged source passage.
    // Edited passages fall back to their saved text rather than stale source documents.
    const source = await this.prisma.question.findFirst({
      where: { part: 7, passage: version.text, explanation: { startsWith: '[santa-ednet:' } },
      select: { stimulus: true }, orderBy: { id: 'asc' },
    });
    return source?.stimulus ?? null;
  }
  async progress(
    userId: number,
    id: number,
    dto: ReadingProgressDto,
    submit = false,
  ) {
    const attempt = await this.ownedAttempt(userId, id);
    if (attempt.submittedAt) return this.attempt(userId, id);
    const questions = attempt.version.questions as unknown as ReadingQuestion[];
    let answers;
    try {
      answers = validateAnswers(
        attempt.version.text,
        questions,
        dto.answers,
        submit,
      );
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    if (questions[0]?.type === 'MAIN' && dto.currentIndex > 0 && !answers[0])
      throw new BadRequestException(
        'Trả lời câu ý chính trước khi chuyển câu.',
      );
    if (dto.currentIndex >= questions.length)
      throw new BadRequestException('Vị trí câu không hợp lệ.');
    const correct = questions.reduce(
      (n, q, i) => n + Number(answers[i]?.selected === q.answer),
      0,
    );
    await this.prisma.readingAttempt.updateMany({
      where: { id, userId, submittedAt: null },
      data: {
        answers: json(answers),
        currentIndex: dto.currentIndex,
        elapsedSeconds: Math.max(attempt.elapsedSeconds, dto.elapsedSeconds),
        ...(submit
          ? {
              correct,
              total: questions.length,
              submittedAt: new Date(),
              activeKey: null,
            }
          : {}),
      },
    });
    return this.attempt(userId, id);
  }
  async tutor(userId: number, id: number, dto: ReadingTutorDto) {
    const attempt = await this.ownedAttempt(userId, id);
    const questions = attempt.version.questions as unknown as ReadingQuestion[];
    const question =
      dto.questionIndex === undefined
        ? undefined
        : questions[dto.questionIndex];
    if (dto.questionIndex !== undefined && !question)
      throw new BadRequestException('Câu không hợp lệ.');
    if (dto.mode === 'ANSWER' && !attempt.submittedAt)
      throw new ForbiddenException('Nộp bài trước khi xem giải thích đáp án.');
    let selected;
    try {
      selected = dto.selected
        ? evidenceAt(attempt.version.text, dto.selected)
        : undefined;
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    if (selected && selected.text.length > 800)
      throw new BadRequestException('Chọn tối đa 800 ký tự cho gia sư.');
    if (['WORD', 'STRUCTURE', 'EVIDENCE'].includes(dto.mode) && !selected)
      throw new BadRequestException('Hãy bôi chọn từ hoặc đoạn cần hỏi.');
    await this.limit(userId, 'tutor', readingLimits().tutorCalls);
    let content: string;
    if (!attempt.submittedAt && ['HINT', 'EVIDENCE'].includes(dto.mode)) {
      content =
        dto.mode === 'EVIDENCE'
          ? 'Đã ghi nhận đoạn bạn chọn. Hãy kiểm tra đoạn này có trả lời đúng điều câu hỏi yêu cầu không. Sau khi nộp, bạn có thể đối chiếu bằng chứng mẫu; hệ thống không chấm sai chỉ vì hai đoạn khác nhau.'
          : 'Đọc câu hỏi để xác định cần tìm ý chính, chi tiết hay suy luận. Tóm tắt mục đích chung trước, sau đó tìm câu chứa thông tin liên quan. Đối chiếu cách diễn đạt và loại lựa chọn cần thêm giả định ngoài bài.';
    } else {
      const context = tutorContext(
        redactReadingText(attempt.version.text),
        attempt.submittedAt ? question : undefined,
        !!attempt.submittedAt,
        selected
          ? { ...selected, text: redactReadingText(selected.text) }
          : undefined,
        attempt.submittedAt
          ? dto.message
          : `Chỉ giải thích ${dto.mode === 'WORD' ? 'nghĩa theo ngữ cảnh' : 'cấu trúc'} của đoạn đang chọn.`,
      );
      if (context.length > readingLimits().maxTutorContext) {
        throw new BadRequestException(
          'Bài và câu hỏi vượt giới hạn ngữ cảnh của gia sư hiện tại. Bạn vẫn có thể làm và lưu bài.',
        );
      }
      content = await this.aiCall(
        userId,
        'TUTOR',
        context.length,
        () =>
          this.ai.tutor(
            redactReadingText(context),
            !!attempt.submittedAt,
            dto.mode,
          ),
        id,
      );
    }
    const key = `${dto.mode}:${dto.questionIndex ?? 'text'}`;
    await this.prisma.readingAttempt.update({
      where: { id },
      data: { hints: { push: key } },
    });
    return {
      content,
      advisory: dto.mode === 'EVIDENCE',
      beforeSubmission: !attempt.submittedAt,
    };
  }
  async aiCall<T>(
    userId: number,
    action: string,
    inputChars: number,
    call: () => Promise<T>,
    attemptId?: number,
  ): Promise<T> {
    const began = Date.now();
    try {
      const value = await call();
      await this.prisma.readingAiEvent.create({
        data: {
          userId,
          attemptId,
          action,
          status: 'SUCCESS',
          inputChars,
          outputChars: JSON.stringify(value).length,
          durationMs: Date.now() - began,
        },
      });
      return value;
    } catch {
      await this.prisma.readingAiEvent.create({
        data: {
          userId,
          attemptId,
          action,
          status: 'FAILED',
          inputChars,
          durationMs: Date.now() - began,
          error: 'AI_TIMEOUT_QUOTA_OR_INVALID_OUTPUT',
        },
      });
      throw new BadRequestException(
        'AI chưa thể xử lý yêu cầu. Hãy thử lại sau; bài và tiến độ đã lưu vẫn dùng được.',
      );
    }
  }
  async saveWord(userId: number, id: number, dto: ReadingWordDto) {
    const attempt = await this.ownedAttempt(userId, id);
    let selected;
    try {
      selected = evidenceAt(attempt.version.text, {
        start: dto.start,
        end: dto.end,
        text: dto.word,
      });
    } catch (e) {
      throw new BadRequestException((e as Error).message);
    }
    if (!dto.meaning.trim())
      throw new BadRequestException('Nhập nghĩa theo ngữ cảnh.');
    const before = attempt.version.text.slice(0, selected.start);
    const sentenceStart =
      Math.max(
        before.lastIndexOf('.'),
        before.lastIndexOf('!'),
        before.lastIndexOf('?'),
        before.lastIndexOf('\n'),
      ) + 1;
    const tail = attempt.version.text.slice(selected.end);
    const stop = tail.search(/[.!?\n]/);
    const sentence = attempt.version.text
      .slice(
        sentenceStart,
        stop < 0 ? attempt.version.text.length : selected.end + stop + 1,
      )
      .trim()
      .slice(0, 1800);
    const folder = await this.prisma.flashcardFolder.upsert({
      where: { readingKey: `reading:${userId}` },
      create: {
        userId,
        readingKey: `reading:${userId}`,
        private: true,
        name: 'Từ vựng Reading',
        description: 'Từ và câu gốc trong các bài đọc của bạn.',
      },
      update: {},
    });
    const readingKey = `${userId}:${attempt.version.id}:${dto.word.trim().toLowerCase()}:${createHash('sha256').update(sentence).digest('hex')}`;
    return this.prisma.flashcard.upsert({
      where: { readingKey },
      create: {
        readingKey,
        userId,
        folderId: folder.id,
        sourceVersionId: attempt.version.id,
        word: dto.word.trim(),
        meaning: dto.meaning.trim(),
        example: sentence,
        topic: `Reading · ${attempt.version.title}`,
        notes: dto.notes,
      },
      update: { meaning: dto.meaning.trim(), notes: dto.notes },
    });
  }
  async report(
    userId: number,
    id: number,
    reason: string,
    questionIndex?: number,
  ) {
    const attempt = await this.ownedAttempt(userId, id);
    if (
      questionIndex !== undefined &&
      !(attempt.version.questions as unknown as ReadingQuestion[])[
        questionIndex
      ]
    )
      throw new BadRequestException('Câu không hợp lệ.');
    if (!reason.trim()) throw new BadRequestException('Nhập nội dung báo lỗi.');
    await this.limit(userId, 'report', 10);
    return this.prisma.readingReport.create({
      data: { userId, versionId: attempt.versionId, reason, questionIndex },
    });
  }
  async draft(userId: number, dto: ReadingDraftDto, articleId?: number) {
    if (!dto.title.trim() || !dto.topic.trim())
      throw new BadRequestException('Nhập tên và chủ đề.');
    // Validation mode is derived from persisted source provenance, never request data.
    const existing = articleId ? await this.systemArticle(articleId) : undefined;
    const currentSource = existing?.versions.find(version => version.id === existing.currentVersionId) ?? existing?.versions[0];
    const sourceCrawl = !dto.aiDraft && currentSource?.origin === 'CRAWL';
    if (sourceCrawl) {
      if (!dto.text.trim() || dto.text.length > readingLimits().maxText)
        throw new BadRequestException('Văn bản nguồn rỗng hoặc vượt giới hạn ký tự.');
    } else this.checkText(dto.text);
    let questions: ReadingQuestion[];
    if (dto.aiDraft) {
      await this.limit(userId, 'generate', readingLimits().generations);
      questions = await this.aiCall(
        userId,
        'ADMIN_DRAFT',
        dto.text.length,
        () => this.ai.questions(dto.text),
      );
    } else {
      try {
        questions = validateQuestions(
          dto.text,
          dto.questions,
          readingLimits().maxQuestions,
          { sourceCrawl },
        ).map(({ learning: _learning, ...question }) => question);
        // A manual revision may change the task/source. Do not carry AI-assigned
        // objectives or source-card pointers into an edited version as if fresh.
      } catch (e) {
        throw new BadRequestException((e as Error).message);
      }
    }
    return this.prisma.$transaction(async (db) => {
      const article = articleId
        ? await db.readingArticle.findFirst({
            where: { id: articleId, ownerId: null },
          })
        : await db.readingArticle.create({
            data: {
              key: `system:${randomUUID()}`,
              title: dto.title,
              originalText: dto.text,
              status: 'DRAFT',
            },
          });
      if (!article) throw new NotFoundException('Không tìm thấy bài hệ thống.');
      await db.$executeRaw`SELECT pg_advisory_xact_lock(0, ${article.id}::integer)`;
      const last = await db.readingVersion.aggregate({
        where: { articleId: article.id },
        _max: { revision: true },
      });
      const version = await db.readingVersion.create({
        data: {
          articleId: article.id,
          revision: (last._max.revision || 0) + 1,
          title: dto.title,
          text: dto.text,
          topic: dto.topic,
          kind: dto.kind,
          difficulty: dto.difficulty,
          origin: dto.aiDraft ? 'AI_DRAFT' : sourceCrawl ? 'CRAWL' : 'SYSTEM',
          questions: json(questions),
        },
      });
      await db.readingArticle.update({
        where: { id: article.id },
        data: {
          currentVersionId: version.id,
          title: dto.title,
          status: 'DRAFT',
        },
      });
      return { articleId: article.id, version };
    });
  }
  async systemArticle(id: number) {
    const article = await this.prisma.readingArticle.findFirst({
      where: { id, ownerId: null },
      include: { versions: { orderBy: { revision: 'desc' } } },
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài hệ thống.');
    return article;
  }
  async review(id: number, versionId: number) {
    await this.systemArticle(id);
    const version = await this.prisma.readingVersion.findFirst({
      where: { id: versionId, articleId: id },
    });
    if (!version) throw new NotFoundException();
    try {
      validateQuestions(
        version.text,
        version.questions,
        readingLimits().maxQuestions,
        { sourceCrawl: version.origin === 'CRAWL' },
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    return this.prisma.readingVersion.update({
      where: { id: versionId },
      data: { reviewed: true },
    });
  }
  async publish(id: number, versionId: number) {
    await this.systemArticle(id);
    const version = await this.prisma.readingVersion.findFirst({
      where: { id: versionId, articleId: id, reviewed: true },
    });
    if (!version)
      throw new BadRequestException('Duyệt đúng phiên bản trước khi xuất bản.');
    return this.prisma.readingArticle.update({
      where: { id },
      data: {
        publishedVersionId: versionId,
        archived: false,
        status: 'PUBLISHED',
      },
    });
  }
  async archive(id: number) {
    await this.systemArticle(id);
    return this.prisma.readingArticle.update({
      where: { id },
      data: { archived: true },
    });
  }
  async adminOverview() {
    return {
      articles: await this.prisma.readingArticle.findMany({
        where: { ownerId: null },
        include: {
          versions: {
            select: { id: true, revision: true, title: true, reviewed: true },
            orderBy: { revision: 'desc' },
            take: 1,
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      reports: await this.prisma.readingReport.findMany({
        where: { resolved: false },
        select: {
          id: true,
          reason: true,
          questionIndex: true,
          createdAt: true,
          versionId: true,
        },
        take: 100,
      }),
      failures: await this.prisma.readingArticle.findMany({
        where: { status: 'FAILED' },
        select: {
          id: true,
          error: true,
          generationAttempts: true,
          updatedAt: true,
        },
        take: 100,
      }),
      usage: await this.prisma.readingAiEvent.groupBy({
        by: ['action', 'status'],
        where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
        _count: true,
        _sum: { inputChars: true, outputChars: true, durationMs: true },
      }),
    };
  }
}
