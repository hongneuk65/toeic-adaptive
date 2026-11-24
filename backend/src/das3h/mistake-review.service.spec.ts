import { jest } from '@jest/globals';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MistakeReviewService } from './mistake-review.service';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from './das3h.service';

describe('mistake review service', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const db = {
    studentSkillHistory: { findMany: jest.fn<any>(), findFirst: jest.fn<any>() },
    question: { findMany: jest.fn<any>(), findFirst: jest.fn<any>() },
    examAttempt: { findMany: jest.fn<any>(), findFirst: jest.fn<any>() },
    userSkillMastery: { findMany: jest.fn<any>() },
    skill: { findMany: jest.fn<any>() },
  };
  const das3h = { evaluateCandidatesForSkill: jest.fn<any>() };
  const service = new MistakeReviewService(db as unknown as PrismaService, das3h as unknown as Das3hService);
  const h = (questionId: number, isCorrect: boolean, hours: number) => ({ questionId, skillId: 5, isCorrect, createdAt: new Date(now.getTime() - hours * 3600000) });

  beforeEach(() => {
    jest.resetAllMocks();
    db.studentSkillHistory.findMany.mockResolvedValue([h(1, false, 3), h(2, false, 2), h(3, false, 1), h(4, true, 1)]);
    db.question.findMany.mockResolvedValue([{ id: 1, itemDifficulty: 0 }, { id: 2, itemDifficulty: 0 }]);
    db.examAttempt.findMany.mockResolvedValue([{ questionIds: [2] }]);
    db.userSkillMastery.findMany.mockResolvedValue([{ skillId: 5, masteryScore: 0.3 }]);
    db.skill.findMany.mockResolvedValue([{ id: 5, name: 'Thì động từ', part: 5 }]);
    das3h.evaluateCandidatesForSkill.mockImplementation(async (_u: any, _s: any, c: any) => c.map((q: any) => ({ questionId: q.id, predictedProbability: 0.4, predictionSource: 'trained-own-das3h', modelVersion: 'v' })));
  });

  it('hides live-exam and unpublished questions and attaches model predictions', async () => {
    const plan = await service.forUser(7, now);
    expect(plan.skills).toHaveLength(1);
    expect(plan.skills[0].questions.map(q => q.questionId)).toEqual([1]);
    expect(plan.skills[0].questions[0].predictedProbability).toBe(0.4);
    expect(plan.openMistakes).toBe(1);
    expect(db.question.findMany.mock.calls[0][0].select).not.toHaveProperty('correctAnswer');
    expect(JSON.stringify(plan)).not.toContain('correctAnswer');
  });

  it('returns an empty plan without further queries when the learner has no mistakes', async () => {
    db.studentSkillHistory.findMany.mockResolvedValue([h(4, true, 1)]);
    expect(await service.forUser(7, now)).toMatchObject({ skills: [], openMistakes: 0 });
    expect(db.question.findMany).not.toHaveBeenCalled();
  });

  describe('opening one review question', () => {
    beforeEach(() => {
      db.studentSkillHistory.findFirst.mockResolvedValue({ id: 1 });
      db.examAttempt.findFirst.mockResolvedValue(null);
      db.question.findFirst.mockResolvedValue({ id: 1, part: 5, content: 'Q', optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd', itemDifficulty: 0, skills: [{ skillId: 5 }] });
    });

    it('returns the question without grading data', async () => {
      const result = await service.reviewQuestion(7, 1, 5);
      expect(result.selectedQuestion).toEqual({ id: 1, part: 5, content: 'Q', optionA: 'a', optionB: 'b', optionC: 'c', optionD: 'd' });
      expect(result).toMatchObject({ reviewMode: true, predictedProb: 0.4 });
      expect(db.question.findFirst.mock.calls[0][0].select).not.toHaveProperty('correctAnswer');
      expect(db.studentSkillHistory.findFirst).toHaveBeenCalledWith({ where: { userId: 7, questionId: 1, isCorrect: false }, select: { id: true } });
    });

    it('only reopens questions this learner actually missed', async () => {
      db.studentSkillHistory.findFirst.mockResolvedValue(null);
      await expect(service.reviewQuestion(7, 1, 5)).rejects.toBeInstanceOf(NotFoundException);
      expect(db.question.findFirst).not.toHaveBeenCalled();
    });

    it('respects the live exam boundary', async () => {
      db.examAttempt.findFirst.mockResolvedValue({ id: 9 });
      await expect(service.reviewQuestion(7, 1, 5)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects a skill the question does not belong to and invalid ids', async () => {
      await expect(service.reviewQuestion(7, 1, 6)).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.reviewQuestion(7, 0, 5)).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
