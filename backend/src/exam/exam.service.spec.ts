import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';

describe('ExamService', () => {
  let service: ExamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: {} },
        { provide: MasteryQueueService, useValue: {} },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('keeps the Reading budget separate from measured Listening for new deadlines', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const questions = [{id:1,part:1,audioUrl:'/one',stimulus:{audioDurationSeconds:15}}, {id:2,part:5}];
    const deadline = service['deadline']('FULL', [1,5], questions, start);
    expect(deadline.getTime()-start.getTime()).toBe((20+75*60)*1000);
    expect(service['deadline']('MINI', [1,5], questions, start).getTime()-start.getTime()).toBe((20+37.5*60)*1000);
    expect(service['deadline']('CUSTOM', [1,5], questions, start).getTime()-start.getTime()).toBe((20+20*60)*1000);
  });
});

// Draft sync must keep ownership, deadline and compare-and-swap checks without loading the exam snapshot.
describe('Exam draft sync', () => {
  const attempt = { id: 9, userId: 3, submittedAt: null, questionIds: [101], deadlineAt: new Date(Date.now() + 600000) };
  const dto = { revision: 2, answers: [{ questionId: 101, selectedAnswer: 'B' }] };
  function setup(value: unknown = attempt, count = 1) {
    const db = { examAttempt: { findUnique: jest.fn<() => Promise<unknown>>().mockResolvedValue(value), updateMany: jest.fn<() => Promise<{count: number}>>().mockResolvedValue({ count }) } };
    return { db, service: new ExamService(db as unknown as PrismaService, {} as MasteryQueueService) };
  }
  it('uses a small projection and a single conditional write', async () => {
    const { db, service } = setup();
    await expect(service.saveDraft(3, 9, dto)).resolves.toMatchObject({ draftRevision: 2 });
    expect(db.examAttempt.findUnique).toHaveBeenCalledWith({ where: { id: 9 }, select: { id: true, userId: true, submittedAt: true, questionIds: true, deadlineAt: true } });
    expect(db.examAttempt.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ draftRevision: 1, submittedAt: null }), data: { draftAnswers: dto.answers, draftRevision: 2 } }));
  });
  it.each([
    ['missing', null, 3], ['not owned', attempt, 4], ['submitted', { ...attempt, submittedAt: new Date() }, 3],
    ['expired', { ...attempt, deadlineAt: new Date(0) }, 3],
  ])('does not write when %s', async (_name, value, userId) => {
    const { db, service } = setup(value);
    await expect(service.saveDraft(userId as number, 9, dto)).rejects.toThrow();
    expect(db.examAttempt.updateMany).not.toHaveBeenCalled();
  });
  it('rejects stale revisions instead of overwriting another session', async () => {
    const { service } = setup(attempt, 0);
    await expect(service.saveDraft(3, 9, dto)).rejects.toThrow('Bản nháp đã thay đổi');
  });
  it('rejects answers outside the attempt before writing', async () => {
    const { db, service } = setup();
    await expect(service.saveDraft(3, 9, { ...dto, answers: [{ questionId: 999, selectedAnswer: 'A' }] })).rejects.toThrow();
    expect(db.examAttempt.updateMany).not.toHaveBeenCalled();
  });
});
