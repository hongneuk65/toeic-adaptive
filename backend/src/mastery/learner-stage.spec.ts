import { learnerStage } from './learner-stage';

describe('shared learning guidance', () => {
  it('does not invent a level for cold start or sparse evidence', () => {
    expect(learnerStage([]).stage).toBe('unassessed');
    expect(learnerStage([{ practiceCount: 99, masteryScore: .9 }]).stage).toBe('unassessed');
    expect(learnerStage([{ practiceCount: 0, masteryScore: .1 }, { practiceCount: 0, masteryScore: .1 }]).stage).toBe('unassessed');
  });
  it('uses only observed valid scores and returns guidance rather than test-score claims', () => {
    const skills = (score: number) => [{ practiceCount: 5, masteryScore: score }, { practiceCount: 5, masteryScore: score }];
    expect(learnerStage(skills(.4)).stage).toBe('foundation');
    expect(learnerStage(skills(.7)).stage).toBe('developing');
    expect(learnerStage(skills(.9)).stage).toBe('consolidating');
    expect(learnerStage([...skills(.7), { practiceCount: 99, masteryScore: NaN }]).observedSkills).toBe(2);
  });
});
