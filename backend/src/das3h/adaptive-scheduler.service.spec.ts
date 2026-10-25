import { jest } from '@jest/globals';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdaptiveSchedulerService } from './adaptive-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from './das3h.service';

describe('adaptive selection', () => {
  const db = {
    studentSkillHistory: { findMany: jest.fn<any>() },
    question: { findMany: jest.fn<any>() },
  };
  const predictor = { evaluateCandidatesForSkill: jest.fn<any>() };
  const service = new AdaptiveSchedulerService(db as unknown as PrismaService, predictor as unknown as Das3hService);
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Math, 'random').mockReturnValue(.5);
    db.studentSkillHistory.findMany.mockResolvedValue([]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('excludes recent questions across skills and selects the closest target probability', async () => {
    db.studentSkillHistory.findMany.mockResolvedValue([{ questionId: 9 }, { questionId: 9 }, { questionId: 8 }]);
    db.question.findMany.mockResolvedValueOnce([{ id: 1, itemDifficulty: 0 }, { id: 2, itemDifficulty: 1 }])
      .mockResolvedValueOnce([{ id: 1, content: 'first', itemDifficulty: 0 }, { id: 2, content: 'second', itemDifficulty: 1 }]);
    predictor.evaluateCandidatesForSkill.mockResolvedValue([
      { questionId: 1, predictedProbability: .95 }, { questionId: 2, predictedProbability: .74 },
    ]);
    const result = await service.getNextAdaptiveQuestion(7, 3);
    expect(db.studentSkillHistory.findMany.mock.calls[0][0].where).toEqual({ userId: 7 });
    expect(db.question.findMany.mock.calls[0][0].where.id.notIn).toEqual([9, 8]);
    expect(result.selectedQuestion.id).toBe(2);
    expect(result.selectedQuestion).not.toHaveProperty('itemDifficulty');
    expect(result.reusingRecentQuestions).toBe(false);
    expect(predictor.evaluateCandidatesForSkill).toHaveBeenCalledTimes(1);
  });

  it('uses the oldest question when the entire small bank was recently practiced', async () => {
    db.studentSkillHistory.findMany.mockResolvedValue([{ questionId: 2 }, { questionId: 1 }]);
    db.question.findMany.mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 1, itemDifficulty: 0 }, { id: 2, itemDifficulty: 0 }])
      .mockResolvedValueOnce([{ id: 1, itemDifficulty: 0 }]);
    predictor.evaluateCandidatesForSkill.mockResolvedValue([{ questionId: 1, predictedProbability: .7 }]);
    const result = await service.getNextAdaptiveQuestion(7, 3);
    expect(db.question.findMany.mock.calls[2][0].where.id.in).toEqual([1]);
    expect(result.selectedQuestion.id).toBe(1);
    expect(result.reusingRecentQuestions).toBe(true);
  });

  it('reports an empty bank instead of returning an undefined question', async () => {
    db.question.findMany.mockResolvedValue([]);
    await expect(service.getNextAdaptiveQuestion(7, 3)).rejects.toBeInstanceOf(NotFoundException);
    expect(predictor.evaluateCandidatesForSkill).not.toHaveBeenCalled();
  });

  it('rejects invalid skill identifiers without reading the bank', async () => {
    await expect(service.getNextAdaptiveQuestion(7, -1)).rejects.toBeInstanceOf(BadRequestException);
    expect(db.question.findMany).not.toHaveBeenCalled();
  });
});
