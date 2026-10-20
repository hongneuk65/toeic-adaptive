import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ExamAttempt, ExamType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { questionSelect } from '../common/question-select';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { ExamService } from './exam.service';
import { StartExamDto } from './dto/start-exam.dto';

describe('Exam behavior', () => {
  const startedAt = new Date();
  const makeAttempt = (): ExamAttempt => ({
    id: 10, userId: 1, examType: ExamType.PART_5, selectedParts: [], questionIds: [2, 1],
    startedAt, submittedAt: null, listeningScore: null, readingScore: null,
    totalScore: null, createdAt: startedAt, updatedAt: startedAt,
    deadlineAt: new Date(Date.now() + 1200000), questionSnapshot: null, draftAnswers: [], draftRevision: 0,
  });
  const questions = [1, 2].map((id) => ({
    id, part: 5, correctAnswer: 'A', skills: [{ skillId: 7 }],
  }));
  const tx = {
    examAttempt: { updateMany: jest.fn<() => Promise<{ count: number }>>() },
    masteryOutbox: { createMany: jest.fn() },
    examAnswer: { createMany: jest.fn<() => Promise<{ count: number }>>() },
  };
  const db = {
    examAttempt: {
      updateMany: jest.fn<() => Promise<{ count: number }>>(),
      findUnique: jest.fn<() => Promise<ExamAttempt | null>>(),
      create: jest.fn<() => Promise<ExamAttempt>>(),
    },
    question: { findMany: jest.fn<() => Promise<typeof questions>>() },
    examAnswer: { findMany: jest.fn<() => Promise<unknown[]>>() },
    $transaction: jest.fn<(callback: (client: typeof tx) => Promise<void>) => Promise<void>>(),
  };
  const queue = { enqueueBulkMasteryUpdate: jest.fn<() => Promise<void>>() };
  let service: ExamService;

  beforeEach(() => {
    jest.resetAllMocks();
    db.examAttempt.findUnique.mockResolvedValue(makeAttempt());
    db.examAttempt.create.mockResolvedValue(makeAttempt());
    db.question.findMany.mockResolvedValue(questions);
    db.examAnswer.findMany.mockResolvedValue([]);
    db.examAttempt.updateMany.mockResolvedValue({count: 1});
    tx.examAttempt.updateMany.mockResolvedValue({ count: 1 });
    tx.examAnswer.createMany.mockResolvedValue({ count: 2 });
    db.$transaction.mockImplementation((callback) => callback(tx));
    queue.enqueueBulkMasteryUpdate.mockResolvedValue();
    service = new ExamService(db as unknown as PrismaService, queue as unknown as MasteryQueueService);
  });

  it.each([ExamType.FULL, ExamType.MINI, ExamType.PART_5])('persists the selected %s exam membership', async (examType) => {
    const counts = { FULL: [6, 25, 39, 30, 30, 16, 54], MINI: [3, 12, 21, 15, 15, 8, 26], PART_5: [30] };
    let nextId = 0;
    const ids: number[] = [];
    for (const [index, count] of counts[examType].entries()) {
      db.question.findMany.mockResolvedValueOnce(Array.from({ length: count }, (_, position) => {
        const id = ++nextId;
        ids.push(id);
        const part = examType === ExamType.PART_5 ? 5 : index + 1;
        return { ...questions[0], id, part, content: `[${position % 4 + 1}]`,
          audioUrl: `/audio/${part}/${Math.floor(position / 3)}`, passage: `passage-${part}-${part === 6 ? Math.floor(position / 4) : position}` };
      }));
    }
    const result = await service.startExam(1, { examType });
    expect(result.totalQuestions).toBe(nextId);
    const selectedIds = result.questions.map(q => (q as { id: number }).id);
    expect([...selectedIds].sort((a,b) => a-b)).toEqual(ids);
    expect(db.examAttempt.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 1, examType, selectedParts: [], questionIds: selectedIds, questionSnapshot: expect.any(Array), deadlineAt: expect.any(Date) }) });
    for (const call of db.question.findMany.mock.calls) {
      expect(call).toEqual([expect.objectContaining({ select: expect.objectContaining(questionSelect) })]);
      expect(call).toEqual([expect.objectContaining({ where: expect.objectContaining({ OR: expect.arrayContaining([{ explanation: { startsWith: '[santa-ednet:' } }]) }) })]);
    }
    expect(questionSelect).not.toHaveProperty('correctAnswer');
    expect(questionSelect).not.toHaveProperty('explanation');
  });

  it('does not create an undersized exam', async () => {
    await expect(service.startExam(1, { examType: ExamType.PART_5 })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.examAttempt.create).not.toHaveBeenCalled();
  });
  it('persists a custom selection and only fetches its chosen parts', async () => {
    db.question.findMany.mockResolvedValueOnce(Array.from({ length: 30 }, (_, index) => ({ ...questions[0], id: index + 1, part: 5 })));
    db.examAttempt.create.mockResolvedValue({ ...makeAttempt(), examType: ExamType.CUSTOM, selectedParts: [5] });
    const result = await service.startExam(1, { examType: ExamType.CUSTOM, parts: [5] });
    expect(result.selectedParts).toEqual([5]);
    expect(result.totalQuestions).toBe(30);
    expect(db.question.findMany).toHaveBeenCalledTimes(1);
    expect(db.examAttempt.create).toHaveBeenCalledWith({ data: expect.objectContaining({ examType: 'CUSTOM', selectedParts: [5] }) });
  });
  it('grades custom answers using persisted selected counts', async () => {
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), examType: ExamType.CUSTOM, selectedParts: [5, 6] });
    const result = await service.submitExam(1, { attemptId: 10, answers: [{ questionId: 1, selectedAnswer: 'A' }] });
    expect(result.listeningScore).toBe(0);
    expect(result.readingScore).toBe(Math.round(495 / 46));
  });
  it('validates nonempty, unique integer custom parts at the API boundary', async () => {
    for (const parts of [undefined, [], [1, 1], [8], [1.5]]) {
      expect((await validate(plainToInstance(StartExamDto, { examType: 'CUSTOM', parts }))).length).toBeGreaterThan(0);
    }
    expect(await validate(plainToInstance(StartExamDto, { examType: 'CUSTOM', parts: [7, 1] }))).toEqual([]);
  });

  it('does not expose the spoken prompt or choice transcripts for Parts 1 and 2', async () => {
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), questionIds: [1, 2] });
    db.question.findMany.mockResolvedValue([
      { ...questions[0], part: 1, content: 'Spoken description', optionA: 'A spoken sentence', optionD: 'Another spoken sentence' },
      { ...questions[1], part: 2, content: 'Spoken question', optionA: 'Spoken response', optionD: '' },
    ] as unknown as typeof questions);
    const result = await service.getExam(1, 10);
    expect(result.questions[0]).toEqual(expect.objectContaining({ content: '', passage: null, optionA: 'A', optionD: 'D' }));
    expect(result.questions[1]).toEqual(expect.objectContaining({ content: '', passage: null, optionA: 'A', optionD: '' }));
  });

  it('resumes in the original order with the original server timestamp', async () => {
    const result = await service.getExam(1, 10);
    expect(result.questions.map((q) => (q as { id: number }).id)).toEqual([2, 1]);
    expect(result.startedAt).toBe(startedAt);
    expect(db.question.findMany).toHaveBeenCalledWith({ where: { id: { in: [2, 1] } }, select: expect.objectContaining(questionSelect) });
  });

  it.each(['resume', 'submit', 'review'])('enforces ownership for %s', async (action) => {
    const request = action === 'resume' ? service.getExam(2, 10) : action === 'review'
      ? service.getReview(2, 10) : service.submitExam(2, { attemptId: 10, answers: [] });
    await expect(request).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.question.findMany).not.toHaveBeenCalled();
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('reports missing attempts', async () => {
    db.examAttempt.findUnique.mockResolvedValue(null);
    await expect(service.getExam(1, 999)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects attempts without a persisted question list', async () => {
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), questionIds: [] });
    await expect(service.getExam(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submitExam(1, { attemptId: 10, answers: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([[1, 1], [999]])('rejects duplicate or out-of-exam answers %j', async (...ids) => {
    await expect(service.submitExam(1, {
      attemptId: 10, answers: ids.map((questionId) => ({ questionId, selectedAnswer: 'A' })),
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('grades a blank submission and stores every unanswered question', async () => {
    const result = await service.submitExam(1, { attemptId: 10, answers: [] });
    expect(result.totalCorrect).toBe(0);
    expect(result.totalScore).toBe(0);
    expect(tx.examAnswer.createMany).toHaveBeenCalledWith({ data: [2, 1].map((questionId) => ({
      attemptId: 10, questionId, selectedAnswer: '', isCorrect: false,
    })) });
    expect(tx.masteryOutbox.createMany).not.toHaveBeenCalled();
  });

  it('records omitted answers but only queues answered questions', async () => {
    const result = await service.submitExam(1, { attemptId: 10, answers: [{ questionId: 1, selectedAnswer: 'A' }] });
    expect(result.readingScore).toBe(17);
    expect(result.totalCorrect).toBe(1);
    expect(tx.masteryOutbox.createMany).toHaveBeenCalledWith({data: [{id: 'exam-10-1', payload: expect.objectContaining({userId: 1, questionId: 1, isCorrect: true, skillIds: [7], occurredAt: expect.any(String)})}], skipDuplicates: true});
  });

  it('refuses to resume or grade when a stored question has disappeared', async () => {
    db.question.findMany.mockResolvedValue([questions[0]]);
    await expect(service.getExam(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submitExam(1, { attemptId: 10, answers: [] })).rejects.toBeInstanceOf(BadRequestException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('returns the committed result for a repeated submission', async () => {
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), submittedAt: startedAt });
    expect(await service.submitExam(1, { attemptId: 10, answers: [] })).toEqual(expect.objectContaining({attemptId: 10, submittedAt: startedAt}));
    expect(tx.examAnswer.createMany).not.toHaveBeenCalled();
  });

  it('allows only one concurrent submission to claim an attempt', async () => {
    tx.examAttempt.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });
    const results = await Promise.allSettled([1, 2].map(() => service.submitExam(1, { attemptId: 10, answers: [] })));
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'fulfilled']);
    expect(tx.examAnswer.createMany).toHaveBeenCalledTimes(1);
    expect(queue.enqueueBulkMasteryUpdate).not.toHaveBeenCalled();
    expect(tx.examAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10, submittedAt: null },
    }));
  });

  it('does not queue observations if saving answers fails', async () => {
    tx.examAnswer.createMany.mockRejectedValue(new Error('database unavailable'));
    await expect(service.submitExam(1, { attemptId: 10, answers: [] })).rejects.toThrow('database unavailable');
    expect(tx.masteryOutbox.createMany).not.toHaveBeenCalled();
    expect(queue.enqueueBulkMasteryUpdate).not.toHaveBeenCalled();
  });

  it('grades the frozen answer even when the bank changes or deletes it', async () => {
    db.examAttempt.findUnique.mockResolvedValue({...makeAttempt(), questionSnapshot: questions as never});
    db.question.findMany.mockResolvedValue([]);
    const result = await service.submitExam(1, {attemptId: 10, answers: [{questionId: 1, selectedAnswer: 'A'}]});
    expect(result.totalCorrect).toBe(1);
    expect(db.question.findMany).not.toHaveBeenCalled();
  });

  it('discards late client edits and grades the saved draft', async () => {
    db.examAttempt.findUnique.mockResolvedValue({...makeAttempt(), deadlineAt: new Date(0), draftAnswers: [{questionId: 1, selectedAnswer: 'A'}]});
    const result = await service.submitExam(1, {attemptId: 10, answers: [{questionId: 2, selectedAnswer: 'A'}]});
    expect(result.totalCorrect).toBe(1);
    expect(tx.examAnswer.createMany).toHaveBeenCalledWith({data: [
      {attemptId: 10, questionId: 2, selectedAnswer: '', isCorrect: false},
      {attemptId: 10, questionId: 1, selectedAnswer: 'A', isCorrect: true},
    ]});
    await expect(service.saveDraft(1, 10, {revision: 1, answers: []})).rejects.toThrow('hết thời gian');
  });

  it('rejects stale draft revisions and exposes no frozen answer before submission', async () => {
    db.examAttempt.updateMany.mockResolvedValue({count: 0});
    await expect(service.saveDraft(1, 10, {revision: 1, answers: []})).rejects.toThrow('Bản nháp');
    db.examAttempt.findUnique.mockResolvedValue({...makeAttempt(), questionSnapshot: questions as never});
    const result = await service.getExam(1, 10);
    expect(result.questions[0]).not.toHaveProperty('correctAnswer');
    expect(result.questions[0]).not.toHaveProperty('skills');
  });

  it('does not reveal review data before submission', async () => {
    await expect(service.getReview(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.examAnswer.findMany).not.toHaveBeenCalled();
  });

  it('returns every stored answer after submission', async () => {
    const answers = [{ questionId: 2, selectedAnswer: '', question: {...questions[1], explanation: ''} }, { questionId: 1, selectedAnswer: 'A', question: {...questions[0], explanation: ''} }];
    db.examAttempt.findUnique.mockResolvedValue({ ...makeAttempt(), submittedAt: startedAt });
    db.examAnswer.findMany.mockResolvedValue(answers);
    expect((await service.getReview(1, 10)).answers).toEqual(answers);
  });
});

describe('SubmitExamDto validation', () => {
  it('allows an empty submission', async () => {
    expect(await validate(plainToInstance(SubmitExamDto, { attemptId: 1, answers: [] }))).toEqual([]);
  });

  it.each([
    { attemptId: 0, answers: [] },
    { attemptId: 1, answers: [{ questionId: -1, selectedAnswer: 'A' }] },
    { attemptId: 1, answers: [{ questionId: 1, selectedAnswer: 'E' }] },
    { attemptId: 1, answers: [1, 1].map((questionId) => ({ questionId, selectedAnswer: 'A' })) },
    { attemptId: 1, answers: Array.from({ length: 201 }, (_, i) => ({ questionId: i + 1, selectedAnswer: 'A' })) },
  ])('rejects invalid input %#', async (body) => {
    expect((await validate(plainToInstance(SubmitExamDto, body))).length).toBeGreaterThan(0);
  });
});
