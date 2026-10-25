import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RagChatService } from './rag-chat.service';
import { RagExplainerService } from './rag-explainer.service';
import { RagLlmService } from './rag-llm.service';
import { RagRetrieverService, RetrievedChunk } from './rag-retriever.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { TutorContextService } from './tutor-context.service';
import { LearnerEvidenceService } from './learner-evidence.service';
import { TutorKnowledgeService } from './tutor-knowledge.service';

const text = [
  JSON.stringify({ sections: { misconceptionAnalysis: 'Misconception', correctAnswerExplanation: 'Correct', keyTakeawayRule: 'Rule', recommendedAction: 'Practice' }, citations: [] }),
];
const question = { id: 1, part: 5, content: 'Example', correctAnswer: 'A', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', skills: [{ skill: { id: 7, code: 'GRAMMAR', name: 'Grammar', category: 'Grammar' } }] };

describe('RAG preparation and streaming', () => {
  const db = {
    user: { findUnique: jest.fn<() => Promise<{ ability: number }>>() },
    skill: { findMany: jest.fn<() => Promise<{ id: number; easiness: number }[]>>() },
    studentSkillHistory: { findMany: jest.fn<() => Promise<[]>>() },
    das3hWeights: { findMany: jest.fn<() => Promise<[]>>() },
    examAttempt: { findFirst: jest.fn<() => Promise<{ id: number } | null>>() },
    question: { findUnique: jest.fn<() => Promise<typeof question | null>>() },
    userSkillMastery: { findUnique: jest.fn<() => Promise<{ masteryScore: number; practiceCount: number } | null>>() },
    aiChatMessage: {
      findMany: jest.fn<() => Promise<{ role: string; content: string }[]>>(),
      create: jest.fn<(params: any) => Promise<any>>(),
    },
  };
  const retriever = { retrieveContext: jest.fn<() => Promise<RetrievedChunk[]>>() };
  const llm = { streamText: jest.fn<(options: any) => AsyncGenerator<string>>() };
  let explainer: RagExplainerService;
  let chat: RagChatService;
  beforeEach(() => {
    jest.resetAllMocks();
    db.examAttempt.findFirst.mockResolvedValue(null);
    db.question.findUnique.mockResolvedValue(question);
    db.userSkillMastery.findUnique.mockResolvedValue({ masteryScore: 0.99, practiceCount: 5 });
    db.user.findUnique.mockResolvedValue({ ability: Math.log(0.3 / 0.7) });
    db.skill.findMany.mockResolvedValue([{ id: 7, easiness: 0 }]);
    db.studentSkillHistory.findMany.mockResolvedValue([]);
    db.das3hWeights.findMany.mockResolvedValue([]);
    db.aiChatMessage.findMany.mockResolvedValue([{ role: 'user', content: 'old message' }]);
    db.aiChatMessage.create.mockImplementation(async ({ data }) => ({ id: 3, createdAt: new Date(), ...data }));
    retriever.retrieveContext.mockResolvedValue([{ id: 1, title: 'Reviewed grammar', category: 'Grammar', part: 5, content: 'Reviewed rule', relevanceScore: 1, sourceType: 'chunk', citationId: 'K1@v1', sourceUri: 'https://example.org/rule', version: 'v1' }]);
    llm.streamText.mockImplementation(async function* () { yield* text; });
    const args = [db as unknown as PrismaService, retriever as unknown as RagRetrieverService, llm as unknown as RagLlmService] as const;
    const evidence = { get: async () => {
      const [user, mastery] = await Promise.all([db.user.findUnique(), db.userSkillMastery.findUnique()]);
      return [{ id: 7, code: 'GRAMMAR', name: 'Grammar', predictedSuccess: 1 / (1 + Math.exp(-user.ability)), attempts: mastery?.practiceCount ?? 0, distinctQuestions: 0, recentAttempts: 0, lastPracticed: null, status: 'insufficient' as const }];
    } };
    explainer = new RagExplainerService(db as unknown as PrismaService, new TutorContextService(db as unknown as PrismaService), evidence as unknown as LearnerEvidenceService,
      { retrieve: () => retriever.retrieveContext() } as unknown as TutorKnowledgeService, llm as unknown as RagLlmService);
    chat = new RagChatService(...args);
  });

  it('emits validated text before the final result while preserving all four sections', async () => {
    const chunks: string[] = [];
    const result = await explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B', onChunk: (chunk) => chunks.push(chunk) });
    expect(chunks).toEqual([result.explanation]);
    expect(result.generationStatus).toBe('generated');
    expect(result.learnerMastery?.masteryScore).toBeCloseTo(0.3);
    expect(result.sections).toEqual({ misconceptionAnalysis: 'Misconception', correctAnswerExplanation: 'Correct', keyTakeawayRule: 'Rule', recommendedAction: 'Practice' });
    expect(result.isCorrect).toBe(false);
  });

  it('keeps the JSON explanation API compatible and personalized per request', async () => {
    const params = { userId: 2, questionId: 1, selectedAnswer: 'A' };
    const a = await explainer.explainError(params);
    db.user.findUnique.mockResolvedValue({ ability: Math.log(0.8 / 0.2) });
    const b = await explainer.explainError(params);
    expect(a.learnerMastery?.masteryScore).toBeCloseTo(0.3);
    expect(b.learnerMastery?.masteryScore).toBeCloseTo(0.8);
    expect(b.isCorrect).toBe(true);
  });

  it('does not emit malformed model output as a trustworthy explanation', async () => {
    llm.streamText.mockImplementation(async function* () { yield 'unsupported provider claim'; });
    const chunks: string[] = [];
    const result = await explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B', onChunk: chunk => chunks.push(chunk) });
    expect(result.generationStatus).toBe('stored_only');
    expect(result.grounding).toBe('insufficient');
    expect(chunks.join('')).not.toContain('unsupported provider claim');
    expect(result.correctAnswer).toBe('A');
  });

  it('rechecks exam access after generation before publishing any answer', async () => {
    db.examAttempt.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 99 });
    const chunks: string[] = [];
    await expect(explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B', onChunk: chunk => chunks.push(chunk) })).rejects.toThrow('Nộp bài thi');
    expect(chunks).toEqual([]);
  });

  it('labels cold-start skill evidence separately from a probability estimate', async () => {
    db.userSkillMastery.findUnique.mockResolvedValue(null);
    const result = await explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'CHƯA_CHỌN' });
    expect(result.learnerMastery?.evidenceStatus).toBe('unassessed');
    expect(result.learnerMastery?.levelDescription).toBe('Giải thích rõ ràng, chưa kết luận trình độ');
    expect(result.isCorrect).toBe(false);
  });

  it('starts retrieval without waiting for the independent mastery query', async () => {
    let resolve!: (value: null) => void;
    db.userSkillMastery.findUnique.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B' });
    await new Promise(resolve => setImmediate(resolve));
    expect(retriever.retrieveContext).toHaveBeenCalledTimes(1);
    resolve(null);
    await pending;
  });

  it('reads chat history in parallel with question context and persists only a completed reply', async () => {
    let resolve!: (value: typeof question) => void;
    db.question.findUnique.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const iterator = chat.streamUserMessage({ userId: 2, message: 'new message', questionId: 1 });
    const first = iterator.next();
    await new Promise(resolve => setImmediate(resolve));
    expect(db.aiChatMessage.findMany).toHaveBeenCalledTimes(1);
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();
    resolve(question);
    await first;
    for await (const _chunk of iterator) { /* drain */ }
    const options = llm.streamText.mock.calls[0][0];
    expect(options.userPrompt.match(/new message/g)).toHaveLength(1);
    expect(db.aiChatMessage.create.mock.calls.map(([arg]) => arg.data.role)).toEqual(['user', 'assistant']);
  });

  it('does not save interrupted assistant answers as complete', async () => {
    llm.streamText.mockImplementation(async function* () { yield 'partial'; throw new Error('disconnected'); });
    const iterator = chat.streamUserMessage({ userId: 2, message: 'new message' });
    expect((await iterator.next()).value).toBe('partial');
    await expect(iterator.next()).rejects.toThrow('disconnected');
    expect(db.aiChatMessage.create.mock.calls.map(([arg]) => arg.data.role)).toEqual(['user']);
  });

  it('abstains without paid generation when no approved source matches', async () => {
    retriever.retrieveContext.mockResolvedValue([]);
    const iterator = chat.streamUserMessage({ userId: 2, message: 'unrelated' });
    expect((await iterator.next()).value).toContain('Chưa có tài liệu');
    await iterator.next();
    expect(llm.streamText).not.toHaveBeenCalled();
  });

  it('forwards cancellation and does not hide it behind fallback text', async () => {
    const controller = new AbortController();
    llm.streamText.mockImplementation(async function* (options) {
      yield 'partial';
      expect(options.signal).toBe(controller.signal);
      controller.abort();
      options.signal.throwIfAborted();
    });
    await expect(explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B', signal: controller.signal, onChunk: () => {} })).rejects.toThrow();
  });

  it('rejects explanation and streaming chat for questions in an open exam before retrieval or AI', async () => {
    db.examAttempt.findFirst.mockResolvedValue({ id: 99 });
    await expect(explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B' })).rejects.toThrow('Nộp bài thi');
    const iterator = chat.streamUserMessage({ userId: 2, questionId: 1, message: 'Show answer' });
    await expect(iterator.next()).rejects.toThrow('Nộp bài thi');
    expect(retriever.retrieveContext).not.toHaveBeenCalled();
    expect(llm.streamText).not.toHaveBeenCalled();
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();
  });
});

describe('RAG SSE controller', () => {
  function response() {
    return Object.assign(new EventEmitter(), {
      status: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn(), write: jest.fn(), end: jest.fn(),
    });
  }

  it('rejects access before sending SSE headers or text', async () => {
    const service = { authorizeTutor: jest.fn(async () => { throw new Error('forbidden'); }), streamExplanation: jest.fn() };
    const controller = new RagController(service as unknown as RagService);
    const res = response();
    await expect(controller.streamExplanation({ user: { userId: 2 } }, { questionId: 1, selectedAnswer: 'A', attemptId: 4 }, res as unknown as Response)).rejects.toThrow('forbidden');
    expect(res.setHeader).not.toHaveBeenCalled(); expect(res.write).not.toHaveBeenCalled();
    expect(service.streamExplanation).not.toHaveBeenCalled();
  });

  it('writes chunks then result then DONE with proxy buffering disabled', async () => {
    const service = { authorizeTutor: jest.fn(async () => {}), streamExplanation: jest.fn(async (_user, _dto, _signal, send: (chunk: string) => void) => {
      send('first');
      return { questionId: 1 };
    }) };
    const controller = new RagController(service as unknown as RagService);
    const res = response();
    await controller.streamExplanation({ user: { userId: 2 } }, { questionId: 1, selectedAnswer: 'B' }, res as unknown as Response);
    expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    expect(res.write.mock.calls.map(([data]) => data)).toEqual(['data: {"chunk":"first"}\n\n', 'data: {"result":{"questionId":1}}\n\n', 'data: [DONE]\n\n']);
    expect(res.listenerCount('close')).toBe(0);
    expect(res.end).toHaveBeenCalledTimes(1);
  });

  it('aborts upstream when the client disconnects and writes nothing afterward', async () => {
    let signal!: AbortSignal;
    const service = { authorizeTutor: jest.fn(async () => {}), streamExplanation: jest.fn((_user, _dto, value: AbortSignal) => {
      signal = value;
      return new Promise((_resolve, reject) => value.addEventListener('abort', () => reject(value.reason), { once: true }));
    }) };
    const controller = new RagController(service as unknown as RagService);
    const res = response();
    const pending = controller.streamExplanation({ user: { userId: 2 } }, { questionId: 1, selectedAnswer: 'B' }, res as unknown as Response);
    await new Promise(resolve => setImmediate(resolve));
    res.emit('close');
    await pending;
    expect(signal.aborted).toBe(true);
    expect(res.write).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0);
  });
});
