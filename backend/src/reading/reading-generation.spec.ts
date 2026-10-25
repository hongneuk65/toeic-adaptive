import { jest } from '@jest/globals';
import { ReadingAiService, redactReadingText } from './reading-ai.service';
import { RagLlmService } from '../rag/rag-llm.service';
import { parseGeneratedQuestions, publicQuestions, validateQuestions } from './reading-core';
import { assertGenerationReview, sourceCards, validateGroundedLearning, validateLearning } from './reading-generation.policy';

const passage = 'The training session will be held on Tuesday in the main meeting room. Employees should register with their supervisor before Friday. The session will cover customer service techniques and include practical examples for new employees. Participants will receive a workbook at the entrance.';
const quote = 'The training session will be held on Tuesday in the main meeting room.';
const question = { type: 'MAIN', prompt: 'What is the notice about?', options: ['A staff training session', 'An office closure', 'A product launch', 'A policy cancellation'],
  answer: 0, explanation: 'Thông báo về buổi đào tạo dành cho nhân viên.', evidenceRequired: true, evidence: [{ text: quote }],
  learning: { level: 'UNDERSTAND', objective: 'Xác định chủ đề chính của thông báo.', sourceCardIds: ['source-1'] } };
const approved = { checks: [{ questionIndex: 0, supportedAnswer: 0, singleAnswer: true, explanationSupported: true, evidenceSufficient: true, objectiveAligned: true }] };

describe('source grounded reading generation', () => {
  const llm = { generateText: jest.fn<any>() };
  const ai = new ReadingAiService(llm as unknown as RagLlmService);
  beforeEach(() => { jest.resetAllMocks(); });

  it('keeps source chunks lossless with valid UTF-16 offsets and bounded size', () => {
    const text = 'ab😀cd\n\n' .repeat(800);
    const cards = sourceCards(text, 31);
    expect(cards.map(c => c.text).join('')).toBe(text);
    for (const [i, c] of cards.entries()) {
      expect(text.slice(c.start, c.end)).toBe(c.text);
      expect(c.end - c.start).toBeLessThanOrEqual(31);
      expect(c.start).toBe(i ? cards[i-1].end : 0);
      expect(c.text.charCodeAt(0) >= 0xDC00 && c.text.charCodeAt(0) <= 0xDFFF).toBe(false);
    }
    expect(() => sourceCards('   ')).toThrow();
  });

  it('requires exact cited source cards and appropriate task levels', () => {
    const parsed = parseGeneratedQuestions(passage, JSON.stringify({ questions: [question] }), 5);
    expect(() => validateGroundedLearning(parsed, sourceCards(passage))).not.toThrow();
    expect(() => validateGroundedLearning([{ ...parsed[0], learning: { ...parsed[0].learning!, sourceCardIds: ['source-99'] } }], sourceCards(passage))).toThrow('đoạn nguồn');
    expect(() => validateGroundedLearning([{ ...parsed[0], learning: { ...parsed[0].learning!, level: 'ANALYZE' } }], sourceCards(passage))).toThrow('Mức xử lý');
    expect(() => validateGroundedLearning([{ ...parsed[0], evidenceRequired: false }], sourceCards(passage))).toThrow();
  });

  it('keeps old questions compatible and hides objectives/card pointers before submission', () => {
    const parsed = parseGeneratedQuestions(passage, JSON.stringify({ questions: [question] }), 5);
    expect(publicQuestions(parsed)[0]).toEqual({ type: 'MAIN', prompt: question.prompt, options: question.options, evidenceRequired: true, learningLevel: 'UNDERSTAND' });
    const { learning: _learning, ...legacy } = parsed[0];
    expect(publicQuestions(validateQuestions(passage, [legacy]))[0]).not.toHaveProperty('learningLevel');
    expect(publicQuestions(parsed)[0]).not.toHaveProperty('learning');
    expect(publicQuestions(parsed)[0]).not.toHaveProperty('answer');
    expect(publicQuestions(parsed)[0]).not.toHaveProperty('evidence');
  });

  it.each([null, { ...question.learning, level: 'CREATE' }, { ...question.learning, sourceCardIds: ['source-1','source-1'] },
    { ...question.learning, objective: '' }, { ...question.learning, sourceCardIds: [1] }])('rejects malformed learning metadata', value => {
    expect(() => validateLearning(value)).toThrow();
  });

  it('checks answers before exposing rationale and shares one timeout budget across all three calls', async () => {
    llm.generateText.mockResolvedValueOnce(JSON.stringify({ questions: [question] }))
      .mockResolvedValueOnce(JSON.stringify(approved)).mockResolvedValueOnce(JSON.stringify(approved));
    const result = await ai.questions(passage);
    expect(result[0].learning?.level).toBe('UNDERSTAND');
    expect(llm.generateText).toHaveBeenCalledTimes(3);
    const [generation, blind, audit] = llm.generateText.mock.calls.map(call => call[0]);
    expect(generation.allowFallback).toBe(false);
    expect(audit.allowFallback).toBe(false);
    expect(blind.allowFallback).toBe(false);
    expect(generation.signal).toBe(audit.signal);
    expect(generation.signal).toBe(blind.signal);
    expect(Object.keys(JSON.parse(blind.userPrompt).questions[0]).sort()).toEqual(['options', 'prompt', 'type']);
    expect(JSON.parse(audit.userPrompt).questions[0]).not.toHaveProperty('answer');
    expect(audit.systemPrompt).toContain('untrusted data');
  });

  it('redacts the complete source before slicing cards so a boundary cannot expose an email', async () => {
    const text = 'z'.repeat(1795) + '@company.test ' + passage;
    const cardIds = sourceCards(text).filter(c => text.indexOf(quote) < c.end && text.indexOf(quote) + quote.length > c.start).map(c => c.id);
    llm.generateText.mockResolvedValueOnce(JSON.stringify({ questions: [{ ...question, learning: { ...question.learning, sourceCardIds: cardIds } }] }))
      .mockResolvedValueOnce(JSON.stringify(approved)).mockResolvedValueOnce(JSON.stringify(approved));
    await ai.questions(text);
    const payload = JSON.parse(llm.generateText.mock.calls[0][0].userPrompt);
    expect(payload.sourceCards.map(c => c.text).join('')).toBe(redactReadingText(text));
    expect(JSON.stringify(payload)).not.toContain('@company.test');
  });

  it('does not call the reviewer for malformed or ungrounded drafts', async () => {
    llm.generateText.mockResolvedValue(JSON.stringify({ questions: [{ ...question, evidence: [{ text: 'invented quote' }] }] }));
    await expect(ai.questions(passage)).rejects.toThrow();
    expect(llm.generateText).toHaveBeenCalledTimes(1);
  });

  it('rejects a reviewer disagreement and a provider failure rather than releasing unchecked questions', async () => {
    llm.generateText.mockResolvedValueOnce(JSON.stringify({ questions: [question] }))
      .mockResolvedValueOnce(JSON.stringify({ checks: [{ ...approved.checks[0], supportedAnswer: 1 }] }));
    await expect(ai.questions(passage)).rejects.toThrow('kiểm tra');
    expect(llm.generateText).toHaveBeenCalledTimes(2); // no rationale call after an incorrect blind answer
    llm.generateText.mockResolvedValueOnce(JSON.stringify({ questions: [question] })).mockRejectedValueOnce(new Error('timeout'));
    await expect(ai.questions(passage)).rejects.toThrow('timeout');
  });

  it('rejects unsupported rationale even after the answer-blind check agrees', async () => {
    llm.generateText.mockResolvedValueOnce(JSON.stringify({ questions: [question] }))
      .mockResolvedValueOnce(JSON.stringify(approved))
      .mockResolvedValueOnce(JSON.stringify({ checks: [{ ...approved.checks[0], explanationSupported: false }] }));
    await expect(ai.questions(passage)).rejects.toThrow('Lời giải');
    expect(llm.generateText).toHaveBeenCalledTimes(3);
  });

  it.each([{ checks: [] }, { checks: [{ ...approved.checks[0], singleAnswer: 'true' }] },
    { checks: [{ ...approved.checks[0], evidenceSufficient: false }] }, { checks: [{ ...approved.checks[0], supportedAnswer: null }] }])
  ('fails closed on incomplete or ambiguous review results', raw => {
    const parsed = parseGeneratedQuestions(passage, JSON.stringify({ questions: [question] }), 5);
    expect(() => assertGenerationReview(JSON.stringify(raw), parsed)).toThrow();
  });
});
