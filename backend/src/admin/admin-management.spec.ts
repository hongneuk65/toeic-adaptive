import { jest } from '@jest/globals';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdminQueryDto,
  ResolveReportDto,
  UpdateQuestionDto,
} from './dto/admin.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { AdminAccessGuard } from './admin-access.guard';
import { importedQuestions } from '../common/imported-questions';

describe('Admin management protections', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    skill: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    question: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    questionSkill: { count: jest.fn() },
    theoryLesson: {
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    knowledgeChunk: { count: jest.fn(), deleteMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    flashcard: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    flashcardFolder: { upsert: jest.fn() },
    readingReport: { findUnique: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };
  let service: AdminService;
  beforeEach(() => {
    jest.resetAllMocks();
    service = new AdminService(prisma as unknown as PrismaService);
    prisma.$transaction.mockImplementation((callback) => callback(prisma));
  });
  const question = { id: 1, part: 2, correctAnswer: 'A', optionD: '', skills: [{ skillId: 2 }], explanation: '[santa-ednet:q12]\nOld', passage: 'Old passage', audioUrl: '/old.mp3', stimulus: { groupId: 'g1', questionPosition: 1, documents: [{ id: 'old' }], audioDurationSeconds: 25 } };
  it('returns edited tutor knowledge to draft instead of retaining obsolete approval', async () => {
    prisma.knowledgeChunk.findUnique.mockResolvedValue({ id: 8, reviewStatus: 'APPROVED' });
    const dto = { title: 'Updated rule', content: 'Revised content', part: 5, category: 'Grammar', keywords: ['rule'] };
    await service.saveKnowledge(dto, 8);
    expect(prisma.knowledgeChunk.update).toHaveBeenCalledWith({ where: { id: 8 }, data: {
      ...dto, reviewStatus: 'DRAFT', reviewedAt: null, reviewedBy: null, approvedContentHash: null,
    } });
  });
  function currentQuestion(extra = {}) {
    prisma.question.findUnique.mockResolvedValue({ id: 1 });
    prisma.question.findUniqueOrThrow.mockResolvedValue({ ...question, ...extra });
    prisma.skill.findMany.mockResolvedValue([{ id: 2, part: 2 }]);
  }
  it('preserves crawl provenance when an explanation is edited', async () => {
    currentQuestion();
    await service.updateQuestion(1, { explanation: 'Better explanation' });
    expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ explanation: '[santa-ednet:q12]\nBetter explanation', optionD: '' }) }));
  });
  it('invalidates derived media while preserving source grouping', async () => {
    currentQuestion();
    await service.updateQuestion(1, { passage: 'Revised', audioUrl: '/new.mp3' });
    const data = prisma.question.update.mock.calls[0][0].data;
    expect(data.stimulus).toEqual({ groupId: 'g1', questionPosition: 1, documents: [], _trainedItemInvalidated: true });
  });
  it('rejects D as a Part 2 answer and missing D on other Parts', async () => {
    currentQuestion();
    await expect(service.updateQuestion(1, { correctAnswer: 'D' })).rejects.toBeInstanceOf(BadRequestException);
    currentQuestion({ part: 5 });
    await expect(service.updateQuestion(1, { optionD: '' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.question.update).not.toHaveBeenCalled();
  });
  it('rejects null patches before database writes', async () => {
    await expect(service.updateQuestion(1, { explanation: null } as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.question.update).not.toHaveBeenCalled();
  });
  it('filters source together with text and part and labels results', async () => {
    prisma.question.findMany.mockResolvedValue([{ id: 1, explanation: '[santa-ednet:q12]' }]);
    prisma.question.count.mockResolvedValue(1);
    const result = await service.list('questions', { source: 'CRAWL', q: 'word', part: 2 });
    expect(prisma.question.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { part: 2, OR: [{ content: { contains: 'word', mode: 'insensitive' } }], explanation: { startsWith: '[santa-ednet:' } } }));
    expect(result.items[0]).toMatchObject({ source: 'CRAWL' });
  });
  it('accepts a real three-choice Part 2 create DTO', async () => {
    const dto = { part: 2, content: 'Listen', audioUrl: '/media/p2.mp3', optionA: 'A', optionB: 'B', optionC: 'C', correctAnswer: 'A', skillIds: [2] };
    expect(await validate(plainToInstance(CreateQuestionDto, dto))).toHaveLength(0);
    prisma.skill.count.mockResolvedValue(1);
    prisma.skill.findMany.mockResolvedValue([{ id: 2, part: 2 }]);
    await service.createQuestion(dto);
    expect(prisma.question.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ optionD: '', explanation: '[admin-question]' }) }));
    expect((await validate(plainToInstance(CreateQuestionDto, { ...dto, part: 5 }))).length).toBeGreaterThan(0);
  });
  it('preserves manual eligibility marker on explanation update', async () => {
    currentQuestion({ explanation: '[admin-question]\nOriginal' });
    await service.updateQuestion(1, { explanation: 'Revised' });
    expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ explanation: '[admin-question]\nRevised' }) }));
  });
  it('updates lessons and invalidates derived knowledge in one transaction', async () => {
    prisma.skill.findUnique.mockResolvedValue({ id: 2, part: 5 });
    prisma.theoryLesson.findUnique.mockResolvedValue({ id: 7 });
    prisma.theoryLesson.update.mockResolvedValue({ id: 7, title: 'Updated' });
    prisma.knowledgeChunk.deleteMany.mockResolvedValue({ count: 3 });
    const dto = {
      title: 'Updated',
      content: 'New explanation',
      part: 5,
      skillId: 2,
    };
    expect(await service.saveTheory(dto, 7)).toEqual({
      id: 7,
      title: 'Updated',
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.theoryLesson.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: dto,
      include: { skill: true },
    });
    expect(prisma.knowledgeChunk.deleteMany).toHaveBeenCalledWith({
      where: { lessonId: 7 },
    });
  });
  it('propagates invalidation failure so the lesson transaction rolls back', async () => {
    prisma.skill.findUnique.mockResolvedValue({ id: 2, part: 5 });
    prisma.theoryLesson.findUnique.mockResolvedValue({ id: 7 });
    prisma.theoryLesson.update.mockResolvedValue({ id: 7 });
    prisma.knowledgeChunk.deleteMany.mockRejectedValue(
      new Error('database failure'),
    );
    await expect(
      service.saveTheory(
        { title: 'Updated', content: 'New', part: 5, skillId: 2 },
        7,
      ),
    ).rejects.toThrow('database failure');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it('never selects password hashes when browsing accounts', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(2);
    expect(
      await service.list('users', { page: 2, pageSize: 10, q: 'learner' }),
    ).toEqual({ items: [], total: 2, page: 2, pageSize: 10 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        select: expect.objectContaining({ email: true }),
      }),
    );
    expect(
      prisma.user.findMany.mock.calls[0][0].select.passwordHash,
    ).toBeUndefined();
  });
  it('blocks self demotion before touching the database', async () => {
    await expect(service.updateRole(1, 1, Role.USER)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('protects the final admin inside a serializable transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 2, role: Role.ADMIN });
    prisma.user.count.mockResolvedValue(1);
    await expect(service.updateRole(1, 2, Role.USER)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'Serializable',
    });
  });
  it('updates a role without exposing credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 2, role: Role.USER });
    prisma.user.update.mockResolvedValue({ id: 2, role: Role.ADMIN });
    await service.updateRole(1, 2, Role.ADMIN);
    expect(
      prisma.user.update.mock.calls[0][0].select.passwordHash,
    ).toBeUndefined();
  });
  it('rejects missing authentication identity without database access', async () => {
    const guard = new AdminAccessGuard(prisma as unknown as PrismaService);
    const context = { switchToHttp: () => ({ getRequest: () => ({}) }) };
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
  it('rejects revoked admin tokens using current database role', async () => {
    prisma.user.findUnique.mockResolvedValue({ role: Role.USER });
    const guard = new AdminAccessGuard(prisma as unknown as PrismaService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 4, role: Role.ADMIN } }),
      }),
    };
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('does not mutate unknown reports', async () => {
    prisma.readingReport.findUnique.mockResolvedValue(null);
    await expect(
      service.resolveReport('reading', 99, true),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.readingReport.update).not.toHaveBeenCalled();
  });
  it('rejects invalid and unbounded input', async () => {
    expect(
      (await validate(plainToInstance(AdminQueryDto, { pageSize: 1000 })))
        .length,
    ).toBeGreaterThan(0);
    expect(
      (await validate(plainToInstance(UpdateQuestionDto, { skillIds: [1, 1] })))
        .length,
    ).toBeGreaterThan(0);
    expect(
      (await validate(plainToInstance(ResolveReportDto, { resolved: 'false' })))
        .length,
    ).toBeGreaterThan(0);
  });
  it('rejects a question part edit that conflicts with existing skill links', async () => {
    prisma.question.findUnique.mockResolvedValue({ id: 1 });
    prisma.question.findUniqueOrThrow.mockResolvedValue({
      id: 1,
      part: 5,
      skills: [{ skillId: 2 }],
    });
    prisma.skill.findMany.mockResolvedValue([{ id: 2, part: 5 }]);
    await expect(service.updateQuestion(1, { part: 6 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.question.update).not.toHaveBeenCalled();
  });
  it('prevents changing the code of a referenced skill', async () => {
    prisma.skill.findUnique.mockResolvedValue({ id: 2 });
    prisma.skill.findUniqueOrThrow.mockResolvedValue({
      id: 2,
      part: 5,
      code: 'OLD',
    });
    prisma.questionSkill.count.mockResolvedValue(1);
    prisma.theoryLesson.count.mockResolvedValue(0);
    prisma.knowledgeChunk.count.mockResolvedValue(0);
    await expect(
      service.saveSkill(
        { code: 'NEW', name: 'Grammar', part: 5, category: 'Grammar' },
        2,
      ),
    ).rejects.toThrow('Không thể đổi mã');
  });
  it('does not mutate a personal flashcard', async () => {
    prisma.flashcard.findUnique.mockResolvedValue({
      id: 1,
      userId: 9,
      folderId: 2,
    });
    await expect(
      service.saveSystemFlashcard({ word: 'test', meaning: 'test' }, 8, 1),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.flashcard.update).not.toHaveBeenCalled();
  });
  it('publishes system cards in a public folder learners can study', async () => {
    prisma.flashcardFolder.upsert.mockResolvedValue({ id: 20 });
    prisma.flashcard.create.mockResolvedValue({ id: 4, folderId: 20 });
    await service.saveSystemFlashcard({ word: 'learn', meaning: 'học' }, 8);
    expect(prisma.flashcardFolder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { readingKey: 'admin-system-vocabulary' },
        create: expect.objectContaining({
          private: false,
          userId: 8,
          name: 'Từ vựng hệ thống',
        }),
      }),
    );
    expect(prisma.flashcard.create).toHaveBeenCalledWith({
      data: { word: 'learn', meaning: 'học', userId: null, folderId: 20 },
    });
  });
  it('repairs an existing orphan system card when edited', async () => {
    prisma.flashcard.findUnique.mockResolvedValue({
      id: 4,
      userId: null,
      folderId: null,
      folder: null,
    });
    prisma.flashcardFolder.upsert.mockResolvedValue({ id: 20 });
    await service.saveSystemFlashcard({ word: 'learn', meaning: 'học' }, 8, 4);
    expect(prisma.flashcard.update).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { word: 'learn', meaning: 'học', userId: null, folderId: 20 },
    });
  });
  it('rejects shared cards outside the reserved system folder', async () => {
    prisma.flashcard.findUnique.mockResolvedValue({
      id: 4,
      userId: null,
      folderId: 9,
      folder: { readingKey: 'reading-personal' },
    });
    await expect(
      service.saveSystemFlashcard({ word: 'learn', meaning: 'học' }, 8, 4),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.flashcard.update).not.toHaveBeenCalled();
    expect(prisma.flashcardFolder.upsert).not.toHaveBeenCalled();
  });

  describe('question media integrity', () => {
    const base = { content: 'Q', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', correctAnswer: 'A', skillIds: [2] };
    it('stores blank optional media as NULL on create', async () => {
      prisma.skill.count.mockResolvedValue(1);
      prisma.skill.findMany.mockResolvedValue([{ id: 2, part: 5 }]);
      await service.createQuestion({ ...base, part: 5, passage: '   ', audioUrl: '', imageUrl: '' });
      expect(prisma.question.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ passage: null, audioUrl: null, imageUrl: null }) }));
    });
    it('requires the media each Part needs before creating', async () => {
      await expect(service.createQuestion({ ...base, part: 1, audioUrl: '/a.mp3' })).rejects.toThrow('Part 1 cần hình ảnh');
      await expect(service.createQuestion({ ...base, part: 3, audioUrl: ' ' })).rejects.toThrow('Part 3 cần âm thanh');
      await expect(service.createQuestion({ ...base, part: 7, passage: '' })).rejects.toThrow('Part 7 cần đoạn văn');
      expect(prisma.question.create).not.toHaveBeenCalled();
    });
    it('accepts only HTTPS or same-origin media paths', async () => {
      for (const audioUrl of ['http://cdn.test/a.mp3', 'javascript:alert(1)', '//cdn.test/a.mp3'])
        await expect(service.createQuestion({ ...base, part: 2, optionD: undefined, audioUrl })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.question.create).not.toHaveBeenCalled();
    });
    it('does not treat blank-to-NULL normalization as a media change', async () => {
      currentQuestion({ passage: '' });
      await service.updateQuestion(1, { passage: '', explanation: 'Fixed' });
      const data = prisma.question.update.mock.calls[0][0].data;
      expect(data.passage).toBeNull();
      expect(data.stimulus).toEqual(question.stimulus);
    });
    it('rejects removing required media but keeps legacy rows editable for text fixes', async () => {
      currentQuestion();
      await expect(service.updateQuestion(1, { audioUrl: '' })).rejects.toThrow('Part 2 cần âm thanh');
      expect(prisma.question.update).not.toHaveBeenCalled();
      currentQuestion({ audioUrl: null });
      await service.updateQuestion(1, { explanation: 'Typo fix' });
      expect(prisma.question.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('question lifecycle', () => {
    const draft = { id: 4, part: 2, status: 'DRAFT', correctAnswer: 'A', optionD: '', audioUrl: '/a.mp3', passage: null, imageUrl: null, skills: [{ skill: { part: 2 } }] };
    it('keeps learner banks limited to published items', () => {
      expect(importedQuestions).toMatchObject({ status: 'PUBLISHED' });
    });
    it('creates admin questions as drafts', async () => {
      prisma.skill.count.mockResolvedValue(1);
      prisma.skill.findMany.mockResolvedValue([{ id: 2, part: 2 }]);
      await service.createQuestion({ part: 2, content: 'Q', audioUrl: '/a.mp3', optionA: 'A', optionB: 'B', optionC: 'C', correctAnswer: 'A', skillIds: [2] });
      expect(prisma.question.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'DRAFT' }) }));
    });
    it('publishes only complete items', async () => {
      prisma.question.findUnique.mockResolvedValue({ ...draft, audioUrl: '', skills: [] });
      await expect(service.setQuestionStatus(4, { status: 'PUBLISHED' })).rejects.toThrow(/Part 2 cần âm thanh; Câu hỏi chưa gắn kỹ năng/);
      expect(prisma.question.update).not.toHaveBeenCalled();
      prisma.question.findUnique.mockResolvedValue(draft);
      await service.setQuestionStatus(4, { status: 'PUBLISHED' });
      expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 4 }, data: { status: 'PUBLISHED' } }));
    });
    it('archives without re-validating and rejects unknown items', async () => {
      prisma.question.findUnique.mockResolvedValue({ ...draft, status: 'PUBLISHED', audioUrl: null });
      await service.setQuestionStatus(4, { status: 'ARCHIVED' });
      expect(prisma.question.update).toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'ARCHIVED' } }));
      prisma.question.findUnique.mockResolvedValue(null);
      await expect(service.setQuestionStatus(9, { status: 'PUBLISHED' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('knowledge review from the admin UI', () => {
    const updatedAt = new Date('2026-11-20T10:00:00.000Z');
    const chunk = { id: 8, title: 'Rule', content: 'Body', part: 5, skillCode: null, category: 'Grammar', keywords: ['rule'], lessonId: null,
      sourceUri: null, sourceVersion: null, reviewStatus: 'DRAFT', reviewedAt: null, reviewedBy: null, approvedContentHash: null, updatedAt };
    const approve = { action: 'APPROVE' as const, sourceUri: 'https://example.edu/rule', sourceVersion: 'v1', expectedUpdatedAt: updatedAt.toISOString() };
    it('approves exactly the version the reviewer read', async () => {
      prisma.knowledgeChunk.findUnique.mockResolvedValue(chunk);
      prisma.user.findUnique.mockResolvedValue({ email: 'reviewer@test' });
      prisma.knowledgeChunk.updateMany.mockResolvedValue({ count: 1 });
      await expect(service.reviewKnowledge(1, 8, approve)).resolves.toMatchObject({ reviewStatus: 'APPROVED', index: 'DISABLED' });
      expect(prisma.knowledgeChunk.updateMany).toHaveBeenCalledWith({ where: { id: 8, updatedAt },
        data: expect.objectContaining({ reviewStatus: 'APPROVED', reviewedBy: 'reviewer@test', sourceUri: 'https://example.edu/rule', sourceVersion: 'v1' }) });
    });
    it('rejects stale, non-HTTPS and concurrently edited approvals', async () => {
      prisma.knowledgeChunk.findUnique.mockResolvedValue(chunk);
      await expect(service.reviewKnowledge(1, 8, { ...approve, expectedUpdatedAt: '2026-11-19T00:00:00.000Z' })).rejects.toBeInstanceOf(ConflictException);
      await expect(service.reviewKnowledge(1, 8, { ...approve, sourceUri: 'http://example.edu' })).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.knowledgeChunk.updateMany).not.toHaveBeenCalled();
      prisma.knowledgeChunk.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.reviewKnowledge(1, 8, approve)).rejects.toBeInstanceOf(ConflictException);
    });
    it('keeps the approval when embedding indexing fails', async () => {
      const embeddings = { enabled: true, index: jest.fn(async () => { throw new Error('HTTP 429'); }) };
      service = new AdminService(prisma as unknown as PrismaService, embeddings as never);
      prisma.knowledgeChunk.findUnique.mockResolvedValue(chunk);
      prisma.knowledgeChunk.updateMany.mockResolvedValue({ count: 1 });
      await expect(service.reviewKnowledge(1, 8, approve)).resolves.toMatchObject({ reviewStatus: 'APPROVED', index: 'FAILED' });
    });
    it('revokes approved knowledge', async () => {
      prisma.knowledgeChunk.findUnique.mockResolvedValue({ ...chunk, reviewStatus: 'APPROVED' });
      prisma.knowledgeChunk.updateMany.mockResolvedValue({ count: 1 });
      await service.reviewKnowledge(1, 8, { action: 'REVOKE' });
      expect(prisma.knowledgeChunk.updateMany).toHaveBeenCalledWith({ where: { id: 8 }, data: { reviewStatus: 'REVOKED' } });
    });
  });
});
