import { jest } from '@jest/globals';
import { Das3hService } from './das3h.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DAS3H batched current profile', () => {
  const now = new Date('2026-10-18T00:00:00Z');
  const db = {
    skill: { findMany: jest.fn<any>() }, studentSkillHistory: { findMany: jest.fn<any>() },
    das3hWeights: { findMany: jest.fn<any>() }, user: { findUnique: jest.fn<any>() }, question: { findMany: jest.fn<any>() },
  };
  const service = new Das3hService(db as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    db.skill.findMany.mockResolvedValue([{ id: 1, easiness: 0.2 }, { id: 2, easiness: -0.4 }]);
    db.das3hWeights.findMany.mockResolvedValue([]);
    db.user.findUnique.mockResolvedValue({ ability: 0.3 });
  });
  it('moves history through disjoint windows at the requested current time in one batch', async () => {
    db.studentSkillHistory.findMany.mockResolvedValue([
      { skillId: 1, isCorrect: true, createdAt: new Date(now.getTime() - 0.5 * 86400000) },
      { skillId: 2, isCorrect: false, createdAt: new Date(now.getTime() - 10 * 86400000) },
    ]);
    const values = await service.getSkillContributions(1, [1, 2], now);
    expect(values.get(1)).toBeCloseTo(0.2 + Math.log(2) * 0.5);
    expect(values.get(2)).toBeCloseTo(-0.4 - Math.log(2) * 0.18);
    expect(db.studentSkillHistory.findMany).toHaveBeenCalledTimes(1);
    expect(db.das3hWeights.findMany).toHaveBeenCalledTimes(1);
    expect(db.studentSkillHistory.findMany.mock.calls[0][0].where.createdAt.lte).toEqual(now);
  });
  it('averages all question skill contributions with the same rule used for SGD prediction', async () => {
    db.question.findMany.mockResolvedValue([{ id: 11, skills: [{ skillId: 1 }, { skillId: 2 }] }]);
    db.studentSkillHistory.findMany.mockResolvedValue([]);
    const results = await service.evaluateCandidatesForSkill(1, 1, [{ id: 11, itemDifficulty: 0.5 }]);
    expect(results[0].predictedProbability).toBeCloseTo(service.sigmoid(0.3 - 0.5 + (0.2 - 0.4) / 2));
  });
});
