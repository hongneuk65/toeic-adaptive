import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { validate } from 'class-validator';
import { PracticeSupportService } from './practice-support.service';
import { PracticeSupportDto } from './dto/adaptive-answer.dto';
import { PrismaService } from '../prisma/prisma.service';

describe('practice support access and relevance', () => {
  const db = {
    learningAttempt: { findUnique: jest.fn<any>() },
    question: { findUnique: jest.fn<any>() },
    examAttempt: { findFirst: jest.fn<any>() },
    theoryLesson: { findMany: jest.fn<any>() },
  };
  const service = new PracticeSupportService(db as unknown as PrismaService);
  const attempt = {
    userId: 7, scopeId: 11, kind: 'adaptive',
    payloadHash: createHash('sha256').update(JSON.stringify([11, 'B', 3])).digest('hex'),
    result: { isCorrect: false, correctAnswer: 'A', explanation: 'stored' },
  };
  beforeEach(() => {
    jest.resetAllMocks();
    db.learningAttempt.findUnique.mockResolvedValue(attempt);
    db.examAttempt.findFirst.mockResolvedValue(null);
    db.question.findUnique.mockResolvedValue({ skills: [{ skill: { id: 3, code: 'P5_PARTS_OF_SPEECH', name: 'Từ loại' } }] });
    db.theoryLesson.findMany.mockResolvedValue([
      { id: 1, title: 'Thì động từ', part: 5 }, { id: 2, title: 'Từ loại trong câu', part: 5 },
    ]);
  });

  it('returns relevant progressive strategies without answer data or writes', async () => {
    const result = await service.getSupport(7, 11, 3, 'attempt');
    expect(result).toMatchObject({ version: 'practice-support-v1', skillId: 3, skillName: 'Từ loại', lesson: { id: 2 } });
    expect(result.steps).toHaveLength(3);
    expect(result).not.toHaveProperty('correctAnswer');
    expect(result).not.toHaveProperty('explanation');
    expect(db.learningAttempt.findUnique).toHaveBeenCalledWith({ where: { id: 'adaptive-7-attempt' } });
    expect(db.question.findUnique.mock.calls[0][0].select).not.toHaveProperty('correctAnswer');
    expect(await service.getSupport(7, 11, 3, 'attempt')).toEqual(result);
  });

  it.each([null, { ...attempt, userId: 8 }, { ...attempt, kind: 'theory' }, { ...attempt, scopeId: 12 }])
  ('rejects an absent, foreign or unrelated attempt', async row => {
    db.learningAttempt.findUnique.mockResolvedValue(row);
    await expect(service.getSupport(7, 11, 3, 'attempt')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.question.findUnique).not.toHaveBeenCalled();
  });

  it('rejects replacing the original skill even if a question has multiple skills', async () => {
    await expect(service.getSupport(7, 11, 4, 'attempt')).rejects.toBeInstanceOf(BadRequestException);
    expect(db.question.findUnique).not.toHaveBeenCalled();
  });

  it.each([{ isCorrect: true }, null, {}, { isCorrect: 'false' }])('requires a recorded incorrect answer', async result => {
    db.learningAttempt.findUnique.mockResolvedValue({ ...attempt, result });
    await expect(service.getSupport(7, 11, 3, 'attempt')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('respects an active exam boundary even with an old completed practice attempt', async () => {
    db.examAttempt.findFirst.mockResolvedValue({ id: 99 });
    await expect(service.getSupport(7, 11, 3, 'attempt')).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.question.findUnique).not.toHaveBeenCalled();
  });

  it('handles deleted questions or changed skill links without inventing a route', async () => {
    db.question.findUnique.mockResolvedValue(null);
    await expect(service.getSupport(7, 11, 3, 'attempt')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('omits mismatched theory rather than linking an unrelated legacy lesson', async () => {
    db.theoryLesson.findMany.mockResolvedValue([{ id: 1, title: 'Thì động từ', part: 5 }]);
    expect((await service.getSupport(7, 11, 3, 'attempt')).lesson).toBeNull();
  });

  it('validates IDs and requires the UUID of a real answer request at the controller boundary', async () => {
    const dto = Object.assign(new PracticeSupportDto(), { questionId: -1, skillId: '3', attemptId: 'invalid' });
    expect((await validate(dto)).map(error => error.property).sort()).toEqual(['attemptId', 'questionId', 'skillId']);
    Object.assign(dto, { questionId: 11, skillId: 3, attemptId: '78d09aa3-93b1-48bc-8a63-b0f1d2928518' });
    expect(await validate(dto)).toEqual([]);
  });
});
