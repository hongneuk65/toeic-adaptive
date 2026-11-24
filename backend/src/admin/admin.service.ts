import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeEmbeddingService } from '../rag/knowledge-embedding.service';
import { KnowledgeReviewError, approveKnowledge, revokeKnowledge } from '../rag/knowledge-review';
import { importedQuestions } from '../common/imported-questions';
import { loadModel, modelQuestionSelect, trainedSourceId } from '../das3h/trained-das3h';
import { CreateQuestionDto } from './dto/create-question.dto';
import {
  QUESTION_MEDIA_FIELDS,
  assertMediaUrls,
  assertQuestionMedia,
  blankToNull,
  normalizeQuestionMedia,
  questionMediaProblems,
} from './question-media';

import { Prisma, QuestionStatus, Role } from '@prisma/client';
import {
  AdminQueryDto,
  KnowledgeDto,
  KnowledgeReviewDto,
  QuestionStatusDto,
  SystemFlashcardDto,
  SkillDto,
  TheoryDto,
  UpdateQuestionDto,
} from './dto/admin.dto';

const SAFE_USER = {
  id: true,
  email: true,
  role: true,
  createdAt: true,
} as const;
type AdminResource =
  | 'users'
  | 'questions'
  | 'skills'
  | 'theory'
  | 'exams'
  | 'flashcards'
  | 'knowledge'
  | 'readingArticles'
  | 'listeningSources'
  | 'readingReports'
  | 'listeningReports'
  | 'aiEvents'
  | 'auditLogs';
interface ListDelegate {
  findMany(args: unknown): Promise<unknown[]>;
  count(args: unknown): Promise<number>;
}
interface ListConfig {
  model: unknown;
  fields: string[];
  part?: boolean;
  report?: boolean;
  select?: object;
  include?: object;
}

// Equated Delta trung bình theo từng Part (dữ liệu pilot ETS 2018)
const INITIAL_DELTA_BY_PART: Record<number, number> = {
  1: 10.8,
  2: 11.2,
  3: 11.9,
  4: 12.3,
  5: 11.5,
  6: 12.1,
  7: 12.8,
};

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    @Optional() private readonly embeddings?: KnowledgeEmbeddingService,
  ) {}

  async getAllSkills() {
    return this.prisma.skill.findMany({
      orderBy: [{ part: 'asc' }, { id: 'asc' }],
    });
  }

  async createQuestion(dto: CreateQuestionDto) {
    this.validateQuestionOptions(dto.part, dto.correctAnswer, dto.optionD);
    const media = normalizeQuestionMedia({ passage: dto.passage, audioUrl: dto.audioUrl, imageUrl: dto.imageUrl });
    assertMediaUrls(media);
    assertQuestionMedia(dto.part, media);
    // Kiểm tra tính hợp lệ của các skillId
    const skillsCount = await this.prisma.skill.count({
      where: { id: { in: dto.skillIds } },
    });
    if (skillsCount !== dto.skillIds.length) {
      throw new NotFoundException('Một hoặc nhiều skillId không tồn tại');
    }

    await this.validateQuestionSkills(dto.part, dto.skillIds);
    const defaultDelta = INITIAL_DELTA_BY_PART[dto.part] || 11.5;

    // Lưu Question và tự động tạo các bản ghi liên kết QuestionSkill trong transaction
    const question = await this.prisma.question.create({
      data: {
        part: dto.part,
        passage: media.passage,
        audioUrl: media.audioUrl,
        imageUrl: media.imageUrl,
        content: dto.content,
        optionA: dto.optionA,
        optionB: dto.optionB,
        optionC: dto.optionC,
        optionD: dto.part === 2 ? '' : dto.optionD!,
        correctAnswer: dto.correctAnswer,
        explanation: '[admin-question]' + (dto.explanation ? '\n' + dto.explanation : ''),
        difficulty: dto.difficulty,
        itemDifficulty: defaultDelta,
        // Admin items are reviewed before learners can receive them.
        status: QuestionStatus.DRAFT,
        skills: {
          create: dto.skillIds.map((id) => ({
            skill: { connect: { id } },
          })),
        },
      },
      include: {
        skills: {
          include: {
            skill: true,
          },
        },
      },
    });

    return question;
  }

  async overview() {
    const [
      users,
      admins,
      questions,
      skills,
      theory,
      exams,
      flashcards,
      knowledge,
      readingArticles,
      listeningSources,
      openReadingReports,
      openListeningReports,
      aiEvents,
      recentExams,
      questionParts,
      draftQuestions,
      archivedQuestions,
      publishedMissingMedia,
      knowledgePending,
      das3hCoverage,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.question.count(),
      this.prisma.skill.count(),
      this.prisma.theoryLesson.count(),
      this.prisma.examAttempt.count(),
      this.prisma.flashcard.count(),
      this.prisma.knowledgeChunk.count(),
      this.prisma.readingArticle.count(),
      this.prisma.listeningSource.count({ where: { deletedAt: null } }),
      this.prisma.readingReport.count({ where: { resolved: false } }),
      this.prisma.listeningReport.count({ where: { resolved: false } }),
      this.prisma.readingAiEvent.count(),
      this.prisma.examAttempt.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: SAFE_USER } },
      }),
      this.prisma.question.groupBy({
        by: ['part'],
        _count: { _all: true },
        orderBy: { part: 'asc' },
      }),
      this.prisma.question.count({ where: { status: QuestionStatus.DRAFT } }),
      this.prisma.question.count({ where: { status: QuestionStatus.ARCHIVED } }),
      // Learner-visible items that a Part cannot be answered without (legacy rows).
      this.prisma.question.count({ where: { AND: [importedQuestions, { OR: [
        { part: 1, OR: [{ imageUrl: null }, { imageUrl: '' }] },
        { part: { in: [1, 2, 3, 4] }, OR: [{ audioUrl: null }, { audioUrl: '' }] },
        { part: { in: [6, 7] }, OR: [{ passage: null }, { passage: '' }] },
      ] }] } }),
      this.prisma.knowledgeChunk.count({ where: { reviewStatus: 'DRAFT' } }),
      this.das3hCoverage(),
    ]);
    return {
      counts: {
        users,
        admins,
        questions,
        skills,
        theory,
        exams,
        flashcards,
        knowledge,
        readingArticles,
        listeningSources,
        openReadingReports,
        openListeningReports,
        aiEvents,
        draftQuestions,
        archivedQuestions,
        publishedMissingMedia,
        knowledgePending,
      },
      recentExams,
      questionParts,
      das3hCoverage,
    };
  }

  private coverageCache?: { at: number; value: { mode: string; covered: number; published: number } };
  /** Share of learner-visible items the fitted DAS3H model may score; the rest use legacy scoring. */
  private async das3hCoverage() {
    if (this.coverageCache && Date.now() - this.coverageCache.at < 60_000) return this.coverageCache.value;
    const model = loadModel();
    const published = await this.prisma.question.count({ where: importedQuestions });
    let covered = 0;
    if (model) {
      const rows = await this.prisma.question.findMany({ where: { AND: [importedQuestions, { explanation: { startsWith: '[santa-ednet:' } }] }, select: modelQuestionSelect });
      covered = rows.filter(row => trainedSourceId(model, row)).length;
    }
    const value = { mode: model ? 'trained-own-das3h' : 'legacy-heuristic', covered, published };
    this.coverageCache = { at: Date.now(), value };
    return value;
  }

  async list(resource: AdminResource, query: AdminQueryDto) {
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 20;
    const configs = {
      users: {
        model: this.prisma.user,
        fields: ['email'],
        select: {
          ...SAFE_USER,
          ability: true,
          updatedAt: true,
          _count: { select: { examAttempts: true, flashcards: true } },
        },
      },
      questions: {
        model: this.prisma.question,
        fields: ['content'],
        include: { skills: { include: { skill: true } } },
        part: true,
      },
      skills: {
        model: this.prisma.skill,
        fields: ['name', 'code', 'category'],
        part: true,
        include: {
          _count: { select: { questions: true, theoryLessons: true } },
        },
      },
      theory: {
        model: this.prisma.theoryLesson,
        fields: ['title'],
        part: true,
        include: { skill: true },
      },
      exams: {
        model: this.prisma.examAttempt,
        fields: [],
        include: {
          user: { select: SAFE_USER },
          _count: { select: { answers: true } },
        },
      },
      flashcards: {
        model: this.prisma.flashcard,
        fields: ['word', 'meaning', 'topic'],
        include: {
          user: { select: SAFE_USER },
          folder: { select: { id: true, name: true, readingKey: true } },
        },
      },
      auditLogs: {
        model: this.prisma.adminAuditLog,
        fields: ['action', 'entity'],
        include: { actor: { select: SAFE_USER } },
      },
      knowledge: {
        model: this.prisma.knowledgeChunk,
        fields: ['title', 'category', 'skillCode'],
        part: true,
        include: { _count: { select: { embeddings: true } } },
      },
      readingArticles: {
        model: this.prisma.readingArticle,
        fields: ['title'],
        select: {
          id: true,
          title: true,
          status: true,
          ownerId: true,
          archived: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { versions: true } },
        },
      },
      listeningSources: {
        model: this.prisma.listeningSource,
        fields: ['title'],
        include: {
          owner: { select: SAFE_USER },
          _count: { select: { sessions: true, transcripts: true } },
        },
      },
      readingReports: {
        model: this.prisma.readingReport,
        fields: ['reason'],
        report: true,
        include: {
          user: { select: SAFE_USER },
          version: { select: { id: true, title: true, articleId: true } },
        },
      },
      listeningReports: {
        model: this.prisma.listeningReport,
        fields: ['reason'],
        report: true,
        include: {
          user: { select: SAFE_USER },
          source: { select: { id: true, title: true } },
        },
      },
      aiEvents: {
        model: this.prisma.readingAiEvent,
        fields: ['action', 'status'],
        select: {
          id: true,
          userId: true,
          attemptId: true,
          action: true,
          status: true,
          inputChars: true,
          outputChars: true,
          durationMs: true,
          createdAt: true,
          user: { select: SAFE_USER },
        },
      },
    };
    const config: ListConfig = configs[resource];
    const where: Record<string, unknown> = {};
    if (query.q?.trim() && config.fields.length)
      where.OR = config.fields.map((field) => ({
        [field]: { contains: query.q!.trim(), mode: 'insensitive' },
      }));
    if (resource === 'exams' && query.q?.trim()) {
      const term = query.q.trim();
      where.OR = [
        { user: { email: { contains: term, mode: 'insensitive' } } },
        ...(/^\d+$/.test(term) ? [{ id: Number(term) }] : []),
        ...(['FULL', 'MINI', 'PART_5'].includes(term.toUpperCase())
          ? [{ examType: term.toUpperCase() }]
          : []),
      ];
    }
    if (query.part && config.part) where.part = query.part;
    if (query.resolved !== undefined && config.report)
      where.resolved = query.resolved === 'true';
    if (resource === 'questions' && query.source) {
      const crawl = { explanation: { startsWith: '[santa-ednet:' } };
      if (query.source === 'CRAWL') Object.assign(where, crawl);
      else where.AND = [{ OR: [{ explanation: null }, { NOT: crawl }] }];
    }
    if (resource === 'questions' && query.status) where.status = query.status;
    const model = config.model as unknown as ListDelegate;
    const [items, total] = await Promise.all([
      model.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
        ...(config.select ? { select: config.select } : {}),
        ...(config.include ? { include: config.include } : {}),
      }),
      model.count({ where }),
    ]);
    return { items: resource === 'questions' ? items.map(item => {
      const question = item as { explanation?: string | null; part: number; passage?: string | null; audioUrl?: string | null; imageUrl?: string | null };
      return { ...question, source: question.explanation?.startsWith('[santa-ednet:') ? 'CRAWL' : 'OTHER',
        mediaIssues: questionMediaProblems(question.part, question) };
    }) : resource === 'knowledge' ? items.map(item => {
      const { _count, ...row } = item as { _count?: { embeddings: number } };
      return { ...row, indexedChunks: _count?.embeddings ?? 0 };
    }) : items, total, page, pageSize };
  }

  /** DRAFT -> PUBLISHED re-checks everything a learner needs; ARCHIVED keeps exam history intact. */
  async setQuestionStatus(id: number, dto: QuestionStatusDto) {
    const current = await this.prisma.question.findUnique({ where: { id }, include: { skills: { include: { skill: true } } } });
    if (!current) throw new NotFoundException('Không tìm thấy câu hỏi');
    if (current.status === dto.status) return current;
    if (dto.status === QuestionStatus.PUBLISHED) {
      const problems = questionMediaProblems(current.part, current);
      if (current.part === 2 && current.correctAnswer === 'D') problems.push('Part 2 chỉ có đáp án A, B hoặc C');
      if (current.part !== 2 && !current.optionD?.trim()) problems.push('Thiếu phương án D');
      if (!current.skills.length) problems.push('Câu hỏi chưa gắn kỹ năng');
      if (current.skills.some(link => link.skill.part !== current.part)) problems.push('Kỹ năng không cùng Part với câu hỏi');
      if (problems.length) throw new BadRequestException(`Chưa thể xuất bản: ${problems.join('; ')}`);
    }
    return this.prisma.question.update({ where: { id }, data: { status: dto.status }, include: { skills: { include: { skill: true } } } });
  }

  async updateQuestion(id: number, dto: UpdateQuestionDto) {
    if (Object.values(dto).some(value => value === null)) throw new BadRequestException('Dùng chuỗi rỗng để xóa nội dung tùy chọn');
    if (
      !(await this.prisma.question.findUnique({
        where: { id },
        select: { id: true },
      }))
    )
      throw new NotFoundException('Không tìm thấy câu hỏi');
    const { skillIds, ...data } = normalizeQuestionMedia(dto);
    assertMediaUrls(data);
    const current = await this.prisma.question.findUniqueOrThrow({
      where: { id },
      include: { skills: true },
    });
    const part = dto.part ?? current.part;
    // Compare against normalized stored values so '' -> NULL is not a media change.
    const stored = Object.fromEntries(QUESTION_MEDIA_FIELDS.map(field => [field, blankToNull(field, current[field])])) as Record<(typeof QUESTION_MEDIA_FIELDS)[number], string | null>;
    const mediaTouched = QUESTION_MEDIA_FIELDS.filter(field => data[field] !== undefined && data[field] !== stored[field]);
    const merged = Object.fromEntries(QUESTION_MEDIA_FIELDS.map(field => [field, data[field] !== undefined ? data[field] : stored[field]]));
    // Never make an item worse; legacy rows with missing media stay editable for text fixes.
    if (part !== current.part || mediaTouched.length) assertQuestionMedia(part, merged);
    this.validateQuestionOptions(part, dto.correctAnswer ?? current.correctAnswer, dto.optionD ?? current.optionD);
    if (part === 2) data.optionD = '';
    // Keep provenance used by the learning/exam bank when administrators rewrite explanations.
    const marker = current.explanation?.match(/^(?:\[santa-ednet:[^\]]+\]|\[admin-question\])/)?.[0];
    if (marker && dto.explanation !== undefined) {
      const body = dto.explanation.replace(/^(?:\[santa-ednet:[^\]]+\]|\[admin-question\])\s*/, '');
      data.explanation = marker + (body ? '\n' + body : '');
    }
    // Source documents and measured duration are derived from the original media.
    const stimulus = current.stimulus;
    let derived = stimulus && typeof stimulus === 'object' && !Array.isArray(stimulus) ? { ...stimulus } : undefined;
    const stimulusChanged = mediaTouched.length > 0;
    if (stimulusChanged) derived = { ...derived, _trainedItemInvalidated: true };
    if (derived) {
      if (mediaTouched.includes('passage') || mediaTouched.includes('imageUrl') || part !== current.part) derived.documents = [];
      if (mediaTouched.includes('audioUrl')) delete derived.audioDurationSeconds;
    }
    await this.validateQuestionSkills(
      dto.part ?? current.part,
      skillIds ?? current.skills.map((link) => link.skillId),
    );
    if (
      skillIds &&
      (await this.prisma.skill.count({ where: { id: { in: skillIds } } })) !==
        skillIds.length
    )
      throw new NotFoundException('Kỹ năng không tồn tại');
    return this.prisma.question.update({
      where: { id },
      data: {
        ...data,
        ...(derived ? { stimulus: derived as Prisma.InputJsonObject } : {}),
        ...(skillIds
          ? {
              skills: {
                deleteMany: {},
                create: skillIds.map((skillId) => ({ skillId })),
              },
            }
          : {}),
      },
      include: { skills: { include: { skill: true } } },
    });
  }
  async saveSkill(dto: SkillDto, id?: number) {
    if (id && !(await this.prisma.skill.findUnique({ where: { id } })))
      throw new NotFoundException('Không tìm thấy kỹ năng');
    if (id) {
      const current = await this.prisma.skill.findUniqueOrThrow({
        where: { id },
      });
      if (current.code !== dto.code || current.part !== dto.part) {
        const references = await Promise.all([
          this.prisma.questionSkill.count({ where: { skillId: id } }),
          this.prisma.theoryLesson.count({ where: { skillId: id } }),
          this.prisma.knowledgeChunk.count({
            where: { skillCode: current.code },
          }),
        ]);
        if (references.some((count) => count > 0))
          throw new ConflictException(
            'Không thể đổi mã hoặc Part khi kỹ năng đang được sử dụng',
          );
      }
    }
    const duplicate = await this.prisma.skill.findUnique({
      where: { code: dto.code },
    });
    if (duplicate && duplicate.id !== id)
      throw new ConflictException('Mã kỹ năng đã tồn tại');
    return id
      ? this.prisma.skill.update({ where: { id }, data: dto })
      : this.prisma.skill.create({ data: dto });
  }
  async saveTheory(dto: TheoryDto, id?: number) {
    const skill = await this.prisma.skill.findUnique({
      where: { id: dto.skillId },
    });
    if (!skill) throw new NotFoundException('Kỹ năng không tồn tại');
    if (skill.part !== dto.part)
      throw new BadRequestException('Part của bài học phải trùng với kỹ năng');
    if (id && !(await this.prisma.theoryLesson.findUnique({ where: { id } })))
      throw new NotFoundException('Không tìm thấy bài học');
    return id
      ? this.prisma.$transaction(async (tx) => {
          const lesson = await tx.theoryLesson.update({
            where: { id },
            data: dto,
            include: { skill: true },
          });
          // Retrieval also reads live lessons; invalidate stale derived chunks atomically.
          await tx.knowledgeChunk.deleteMany({ where: { lessonId: id } });
          return lesson;
        })
      : this.prisma.theoryLesson.create({
          data: dto,
          include: { skill: true },
        });
  }
  async deleteTheory(id: number) {
    if (!(await this.prisma.theoryLesson.findUnique({ where: { id } })))
      throw new NotFoundException('Không tìm thấy bài học');
    return this.prisma.$transaction(async (tx) => {
      // Remove derived RAG entries alongside the source lesson to avoid stale tutor context.
      await tx.knowledgeChunk.deleteMany({ where: { lessonId: id } });
      await tx.theoryLesson.delete({ where: { id } });
      return { id, deleted: true };
    });
  }
  async updateRole(actorId: number, id: number, role: Role) {
    if (actorId === id && role !== Role.ADMIN)
      throw new BadRequestException('Không thể tự gỡ quyền quản trị');
    return this.prisma.$transaction(
      async (tx) => {
        const user = await tx.user.findUnique({
          where: { id },
          select: SAFE_USER,
        });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');
        if (
          user.role === Role.ADMIN &&
          role !== Role.ADMIN &&
          (await tx.user.count({ where: { role: Role.ADMIN } })) <= 1
        )
          throw new BadRequestException('Phải giữ ít nhất một quản trị viên');
        return tx.user.update({
          where: { id },
          data: { role },
          select: SAFE_USER,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async resolveReport(
    kind: 'reading' | 'listening',
    id: number,
    resolved: boolean,
  ) {
    if (kind === 'reading') {
      if (!(await this.prisma.readingReport.findUnique({ where: { id } })))
        throw new NotFoundException('Không tìm thấy báo cáo');
      return this.prisma.readingReport.update({
        where: { id },
        data: { resolved },
      });
    }
    if (!(await this.prisma.listeningReport.findUnique({ where: { id } })))
      throw new NotFoundException('Không tìm thấy báo cáo');
    return this.prisma.listeningReport.update({
      where: { id },
      data: { resolved },
    });
  }

  async saveKnowledge(dto: KnowledgeDto, id?: number) {
    if (id && !(await this.prisma.knowledgeChunk.findUnique({ where: { id } })))
      throw new NotFoundException('Không tìm thấy tài liệu');
    if (dto.skillCode) {
      const skill = await this.prisma.skill.findUnique({
        where: { code: dto.skillCode },
      });
      if (!skill) throw new NotFoundException('Không tìm thấy kỹ năng');
      if (skill.part !== dto.part)
        throw new BadRequestException('Part phải trùng với kỹ năng');
    }
    return id
      ? this.prisma.knowledgeChunk.update({ where: { id }, data: {
          ...dto,
          // An edited document needs a new review before retrieval can use it.
          reviewStatus: 'DRAFT',
          reviewedAt: null,
          reviewedBy: null,
          approvedContentHash: null,
        } })
      : this.prisma.knowledgeChunk.create({ data: dto });
  }
  async reviewKnowledge(actorId: number, id: number, dto: KnowledgeReviewDto) {
    const row = await this.prisma.knowledgeChunk.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Không tìm thấy tài liệu');
    try {
      if (dto.action === 'REVOKE') {
        await revokeKnowledge(this.prisma, id);
        return { id, reviewStatus: 'REVOKED' };
      }
      if (new Date(dto.expectedUpdatedAt!).getTime() !== row.updatedAt.getTime())
        throw new KnowledgeReviewError('Nội dung đã thay đổi trong lúc duyệt. Tải lại rồi duyệt lại.', 'conflict');
      const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { email: true } });
      const { approvedContentHash } = await approveKnowledge(this.prisma, row, {
        sourceUri: dto.sourceUri!, sourceVersion: dto.sourceVersion!, reviewedBy: actor?.email ?? `admin#${actorId}`,
      });
      // Approval stands even if indexing fails; lexical retrieval still uses approved rows.
      let index: 'INDEXED' | 'DISABLED' | 'FAILED' = 'DISABLED', chunks = 0;
      if (this.embeddings?.enabled) {
        try {
          chunks = await this.embeddings.index({ id, title: row.title, content: row.content, approvedContentHash });
          index = 'INDEXED';
        } catch { index = 'FAILED'; }
      }
      return { id, reviewStatus: 'APPROVED', index, chunks };
    } catch (error) {
      if (error instanceof KnowledgeReviewError)
        throw error.kind === 'conflict' ? new ConflictException(error.message) : new BadRequestException(error.message);
      throw error;
    }
  }
  async saveSystemFlashcard(
    dto: SystemFlashcardDto,
    actorId: number,
    id?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (id) {
        const card = await tx.flashcard.findUnique({
          where: { id },
          include: { folder: { select: { readingKey: true } } },
        });
        if (!card) throw new NotFoundException('Không tìm thấy thẻ');
        if (
          card.userId !== null ||
          (card.folderId !== null &&
            card.folder?.readingKey !== 'admin-system-vocabulary')
        )
          throw new ForbiddenException('Chỉ được chỉnh sửa thẻ hệ thống');
      }
      const folder = await tx.flashcardFolder.upsert({
        where: { readingKey: 'admin-system-vocabulary' },
        create: {
          readingKey: 'admin-system-vocabulary',
          name: 'Từ vựng hệ thống',
          description: 'Bộ từ vựng do quản trị viên biên soạn',
          private: false,
          userId: actorId,
        },
        update: { private: false },
      });
      const data = { ...dto, userId: null, folderId: folder.id };
      return id
        ? tx.flashcard.update({ where: { id }, data })
        : tx.flashcard.create({ data });
    });
  }
  private validateQuestionOptions(part: number, answer: string, optionD?: string) {
    if (part === 2 && answer === 'D') throw new BadRequestException('Part 2 chỉ có đáp án A, B hoặc C');
    if (part !== 2 && !optionD?.trim()) throw new BadRequestException('Part này yêu cầu phương án D');
  }
  private async validateQuestionSkills(part: number, skillIds: number[]) {
    const skills = await this.prisma.skill.findMany({
      where: { id: { in: skillIds } },
      select: { id: true, part: true },
    });
    if (skills.length !== skillIds.length)
      throw new NotFoundException('Kỹ năng không tồn tại');
    if (skills.some((skill) => skill.part !== part))
      throw new BadRequestException(
        'Part của câu hỏi phải trùng với tất cả kỹ năng',
      );
  }
}
