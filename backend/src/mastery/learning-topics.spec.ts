import { groupLearningTopics, topicForLesson, topicForSkill } from './learning-topics';

describe('learning topic curriculum', () => {
  const skill = (skillId: number, skillCode: string, masteryScore: number, practiceCount: number) => ({ skillId, skillCode, masteryScore, practiceCount, part: 5 });
  it('combines related micro skills across parts without treating unseen estimates as weakness', () => {
    const groups = groupLearningTopics([skill(1, 'P5_CONTEXT_VOCAB', .1, 0), { ...skill(2, 'P6_VOCAB_IN_CONTEXT', .8, 12), part: 6 }, skill(3, 'TEST_SKILL_K', .1, 50)], []);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ id: 'context-vocabulary', estimatedSuccess: .8, observedSkillCount: 1, totalSkillCount: 2, priority: 'maintain', parts: [5, 6] });
  });
  it('keeps cold-start scores unknown and chooses least practiced diagnostic skill', () => {
    const group = groupLearningTopics([skill(1, 'P5_PARTS_OF_SPEECH', .01, 0), skill(2, 'P5_SUBJECT_VERB_AGREE', .9, 0)], [])[0];
    expect(group).toMatchObject({ estimatedSuccess: null, evidenceStatus: 'unassessed', priority: 'diagnostic', recommendedSkillId: 1 });
  });
  it('does not let repeated practice in one skill dominate topic estimate', () => {
    const group = groupLearningTopics([skill(1, 'P5_PARTS_OF_SPEECH', .9, 1000), skill(2, 'P5_SUBJECT_VERB_AGREE', .3, 10)], [])[0];
    expect(group.estimatedSuccess).toBeCloseTo(.6);
    expect(group.recommendedSkillId).toBe(2);
    expect(group.priority).toBe('focus');
  });
  it.each([[1], [1, 2], [3]])('prioritizes individual weaknesses even if the group average is strong: %j', (...weak: number[]) => {
    const codes = ['P5_CONTEXT_VOCAB', 'P5_COLLOCATIONS', 'P6_VOCAB_IN_CONTEXT', 'P7A_VOCAB_SYNONYM'];
    const group = groupLearningTopics(codes.map((code, index) => {
      const id = index + 1;
      return skill(id, code, weak.includes(id) ? .6 : .95, 10);
    }), [])[0];
    expect(group.estimatedSuccess).toBeGreaterThan(.65);
    expect(group.priority).toBe('focus');
    expect(group.focusSkillIds).toEqual(weak);
    expect(group.practiceSkillIds.slice(0, weak.length * 2)).toEqual([...weak, ...weak]);
    expect(group.practiceSkillIds).toHaveLength(codes.length + weak.length);
  });
  it('skips skills without questions and does not treat a single attempt as a weakness', () => {
    const group = groupLearningTopics([
      skill(1, 'P5_CONTEXT_VOCAB', .1, 1),
      skill(2, 'P5_COLLOCATIONS', .4, 10),
      skill(3, 'P6_VOCAB_IN_CONTEXT', .7, 10),
    ], [], new Set([1, 3]))[0];
    expect(group.focusSkillIds).toEqual([2]);
    expect(group.practiceSkillIds).toEqual([1, 3]);
  });
  it('classifies Santa lecture titles despite broad legacy Part6 skill assignment', () => {
    const topic = (title: string) => topicForLesson({ title, part: 6, skill: { code: 'P6_GRAMMAR_IN_CONTEXT' } }).id;
    expect(topic('Vị trí từ loại - Tính từ')).toBe('word-forms');
    expect(topic('Thì/Thể của động từ')).toBe('verbs');
    expect(topic('Liên từ và giới từ')).toBe('connections');
    expect(topic('Từ vựng danh từ')).toBe('context-vocabulary');
    expect(topic('Ngữ cảnh - Vận dụng dữ kiện')).toBe('reading-context');
  });
  it('links only lessons classified within the same topic', () => {
    const group = groupLearningTopics([skill(1, 'P5_VERB_TENSES_VOICE', .4, 12)], [
      { id: 10, title: 'Từ vựng danh từ', part: 6, skillId: 1, skill: { code: 'P5_VERB_TENSES_VOICE' } },
      { id: 11, title: 'Thì tiếp diễn', part: 5, skillId: 1, skill: { code: 'P5_VERB_TENSES_VOICE' } },
    ])[0];
    expect(group.lesson?.id).toBe(11);
    expect(topicForSkill('UNKNOWN')).toBeNull();
  });
});
