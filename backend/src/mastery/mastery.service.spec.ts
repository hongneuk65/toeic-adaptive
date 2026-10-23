import { jest } from '@jest/globals';
import { MasteryService } from './mastery.service';
import { Das3hService } from '../das3h/das3h.service';
import { PrismaService } from '../prisma/prisma.service';
import { importedQuestions } from '../common/imported-questions';

describe('mastery learning plan integration', () => {
  const db = {
    skill: { findMany: jest.fn<any>() },
    userSkillMastery: { findMany: jest.fn<any>() },
    user: { findUnique: jest.fn<any>() },
    theoryLesson: { findMany: jest.fn<any>() },
    questionSkill: { findMany: jest.fn<any>() },
  };
  const service = new MasteryService(db as unknown as PrismaService);
  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(Das3hService.prototype, 'getSkillContributions').mockResolvedValue(new Map());
    jest.spyOn(Das3hService.prototype, 'getTrainedSkillScores').mockResolvedValue(new Map([[1, .9]]));
    db.skill.findMany.mockResolvedValue([
      { id: 1, code: 'P5_PARTS_OF_SPEECH', name: 'Từ loại', part: 5, category: 'grammar' },
      { id: 2, code: 'P5_SUBJECT_VERB_AGREE', name: 'Hòa hợp', part: 5, category: 'grammar' },
    ]);
    db.userSkillMastery.findMany.mockResolvedValue([]);
    db.user.findUnique.mockResolvedValue({ ability: 0 });
    db.theoryLesson.findMany.mockResolvedValue([{ id: 8, title: 'Từ loại', part: 5, skillId: 1, skill: { code: 'P5_PARTS_OF_SPEECH' } }]);
    db.questionSkill.findMany.mockResolvedValue([{ skillId: 1 }]);
  });
  afterEach(() => jest.restoreAllMocks());

  it('keeps unassessed evidence despite high model scores and only recommends available practice', async () => {
    const profile = await service.getUserMasteryProfile(7);
    expect(profile.skills).toHaveLength(2);
    expect(profile.learningPlan.items).toHaveLength(1);
    expect(profile.learningPlan.items[0]).toMatchObject({ skillId: 1, priority: 'diagnostic', lesson: { id: 8 }, reviewDueAt: null });
    expect(profile.skills[0]).toMatchObject({ masteryScore: .9, evidenceStatus: 'unassessed' });
    expect(db.questionSkill.findMany).toHaveBeenCalledWith({ where: { question: importedQuestions }, select: { skillId: true }, distinct: ['skillId'] });
  });

  it('rebuilds an overdue review from persisted evidence after answers without a separate schedule write', async () => {
    db.userSkillMastery.findMany.mockResolvedValue([{ skillId: 1, practiceCount: 12, lastPracticed: new Date('2020-01-01T00:00:00Z') }]);
    const profile = await service.getUserMasteryProfile(7);
    expect(profile.learningPlan.items[0]).toMatchObject({ priority: 'review', reviewDueAt: '2020-01-08T00:00:00.000Z' });
    expect(profile.skills[0].masteryScore).toBe(.9);
  });

  it('returns an explicit empty plan when the eligible bank has no mapped skill', async () => {
    db.questionSkill.findMany.mockResolvedValue([]);
    expect((await service.getUserMasteryProfile(7)).learningPlan.items).toEqual([]);
  });
});
