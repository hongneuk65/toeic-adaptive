import { supportStepsForSkill } from './practice-support.policy';
import { LEARNING_TOPICS, topicForSkill } from '../mastery/learning-topics';

const CODES = [
  'P1_PHOTO_OBJECT', 'P1_PHOTO_ACTION', 'P1_PHOTO_LOCATION', 'P1_PHOTO_PASSIVE',
  'P2_WH_QUESTIONS', 'P2_YES_NO_QUESTIONS', 'P2_TAG_QUESTIONS', 'P2_CHOICE_QUESTIONS', 'P2_STATEMENT_RESPONSE', 'P2_INDIRECT_RESPONSE',
  'P3_MAIN_TOPIC', 'P3_DETAIL_LOOKUP', 'P3_ACTION_NEXT', 'P3_SPEAKER_IDENTITY', 'P3_IMPLIED_MEANING', 'P3_GRAPH_LOOKUP',
  'P4_PURPOSE_TALK', 'P4_SPECIFIC_FACT', 'P4_REQUEST_SUGGEST', 'P4_IMPLIED_MEANING', 'P4_GRAPH_LOOKUP',
  'P5_PARTS_OF_SPEECH', 'P5_VERB_TENSES_VOICE', 'P5_SUBJECT_VERB_AGREE', 'P5_CONNECTORS_CONJ', 'P5_RELATIVE_CLAUSES', 'P5_SUBJUNCTIVE_MODAL', 'P5_COLLOCATIONS', 'P5_CONTEXT_VOCAB',
  'P6_GRAMMAR_IN_CONTEXT', 'P6_VOCAB_IN_CONTEXT', 'P6_SENTENCE_INSERTION', 'P6_TRANSITION_WORDS',
  'P7A_MAIN_PURPOSE', 'P7A_FACT_NEGATIVE_FACT', 'P7A_INFERENCE_DETAIL', 'P7A_VOCAB_SYNONYM',
  'P7B_CROSS_INFO_SYNTHESIS', 'P7B_MULTI_INFERENCE', 'P7B_CHAIN_CORRESPONDENCE',
];

describe('authored practice support strategies', () => {
  it('covers every existing topic and seed skill with a non-generic strategy', () => {
    expect(new Set(CODES.map(code => topicForSkill(code)?.id))).toEqual(new Set(LEARNING_TOPICS.map(topic => topic.id)));
    const fallback = supportStepsForSkill('UNKNOWN');
    for (const code of CODES) {
      const steps = supportStepsForSkill(code);
      expect(steps).toHaveLength(3);
      expect(steps).not.toEqual(fallback);
      for (const step of steps) {
        expect(step.title.trim().length).toBeGreaterThan(8);
        expect(step.body.trim().length).toBeGreaterThan(50);
        expect(Object.keys(step).sort()).toEqual(['body', 'title']);
      }
    }
  });

  it('distinguishes agreement from generic word-form guidance', () => {
    const agreement = supportStepsForSkill('P5_SUBJECT_VERB_AGREE');
    expect(agreement).not.toEqual(supportStepsForSkill('P5_PARTS_OF_SPEECH'));
    expect(agreement[0].body).toContain('chủ ngữ');
    expect(agreement[1].body).toContain('số nhiều');
  });

  it('returns deterministic fallback for unknown and empty skill codes', () => {
    expect(supportStepsForSkill('UNKNOWN')).toEqual(supportStepsForSkill(''));
    expect(supportStepsForSkill('UNKNOWN')).toHaveLength(3);
  });

  it('does not let caller mutations alter later requests', () => {
    for (const code of ['UNKNOWN', 'P5_SUBJECT_VERB_AGREE', ...CODES]) {
      const before = supportStepsForSkill(code);
      const edited = supportStepsForSkill(code);
      edited[0].body = 'mutated';
      edited.push({ title: 'extra', body: 'extra' });
      expect(supportStepsForSkill(code)).toEqual(before);
    }
  });
});
