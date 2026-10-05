import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RagChatService } from './rag-chat.service';
import { RagExplainerService } from './rag-explainer.service';
import { RagLlmService } from './rag-llm.service';
import { RagRetrieverService } from './rag-retriever.service';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';

const text = [
  '### 1. Phân tích nguyên nhân chọn sai và bẫy tư duy\nMisconception\n',
  '### 2. Phân tích cặn kẽ đáp án đúng\nCorrect\n',
  '### 3. Quy tắc cốt lõi cần ghi nhớ\nRule\n',
  '### 4. Lộ trình khắc phục đề xuất\nPractice',
];
const question = { id: 1, part: 5, content: 'Example', correctAnswer: 'A', optionA: 'A', optionB: 'B', optionC: 'C', optionD: 'D', skills: [{ skill: { id: 7, code: 'GRAMMAR', name: 'Grammar', category: 'Grammar' } }] };

describe('RAG preparation and streaming', () => {
  const db = {
    question: { findUnique: jest.fn<() => Promise<typeof question | null>>() },
    userSkillMastery: { findUnique: jest.fn<() => Promise<{ masteryScore: number } | null>>() },
    aiChatMessage: {
      findMany: jest.fn<() => Promise<{ role: string; content: string }[]>>(),
      create: jest.fn<(params: any) => Promise<any>>(),
    },
  };
  const retriever = { retrieveContext: jest.fn<() => Promise<[]>>() };
  const llm = { streamText: jest.fn<(options: any) => AsyncGenerator<string>>() };
  let explainer: RagExplainerService;
  let chat: RagChatService;
  beforeEach(() => {
    jest.resetAllMocks();
    db.question.findUnique.mockResolvedValue(question);
    db.userSkillMastery.findUnique.mockResolvedValue({ masteryScore: 0.3 });
    db.aiChatMessage.findMany.mockResolvedValue([{ role: 'user', content: 'old message' }]);
    db.aiChatMessage.create.mockImplementation(async ({ data }) => ({ id: 3, createdAt: new Date(), ...data }));
    retriever.retrieveContext.mockResolvedValue([]);
    llm.streamText.mockImplementation(async function* () { yield* text; });
    const args = [db as unknown as PrismaService, retriever as unknown as RagRetrieverService, llm as unknown as RagLlmService] as const;
    explainer = new RagExplainerService(...args);
    chat = new RagChatService(...args);
  });

  it('streams text before the final result while preserving mastery and all four sections', async () => {
    const chunks: string[] = [];
    const result = await explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B', onChunk: (chunk) => chunks.push(chunk) });
    expect(chunks).toEqual(text);
    expect(result.explanation).toBe(text.join(''));
    expect(result.learnerMastery?.masteryScore).toBe(0.3);
    expect(result.sections).toEqual({ misconceptionAnalysis: 'Misconception', correctAnswerExplanation: 'Correct', keyTakeawayRule: 'Rule', recommendedAction: 'Practice' });
    expect(result.isCorrect).toBe(false);
  });

  it('keeps the JSON explanation API compatible and personalized per request', async () => {
    const params = { userId: 2, questionId: 1, selectedAnswer: 'A' };
    const a = await explainer.explainError(params);
    db.userSkillMastery.findUnique.mockResolvedValue({ masteryScore: 0.8 });
    const b = await explainer.explainError(params);
    expect(a.learnerMastery?.masteryScore).toBe(0.3);
    expect(b.learnerMastery?.masteryScore).toBe(0.8);
    expect(b.isCorrect).toBe(true);
  });

  it('starts retrieval without waiting for the independent mastery query', async () => {
    let resolve!: (value: null) => void;
    db.userSkillMastery.findUnique.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const pending = explainer.explainError({ userId: 2, questionId: 1, selectedAnswer: 'B' });
    await Promise.resolve();
    expect(retriever.retrieveContext).toHaveBeenCalledTimes(1);
    resolve(null);
    await pending;
  });

  it('reads chat history in parallel with question context and persists only a completed reply', async () => {
    let resolve!: (value: typeof question) => void;
    db.question.findUnique.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const iterator = chat.streamUserMessage({ userId: 2, message: 'new message', questionId: 1 });
    const first = iterator.next();
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
});

describe('RAG SSE controller', () => {
  function response() {
    return Object.assign(new EventEmitter(), {
      status: jest.fn(), setHeader: jest.fn(), flushHeaders: jest.fn(), write: jest.fn(), end: jest.fn(),
    });
  }

  it('writes chunks then result then DONE with proxy buffering disabled', async () => {
    const service = { streamExplanation: jest.fn(async (_user, _dto, _signal, send: (chunk: string) => void) => {
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
    const service = { streamExplanation: jest.fn((_user, _dto, value: AbortSignal) => {
      signal = value;
      return new Promise((_resolve, reject) => value.addEventListener('abort', () => reject(value.reason), { once: true }));
    }) };
    const controller = new RagController(service as unknown as RagService);
    const res = response();
    const pending = controller.streamExplanation({ user: { userId: 2 } }, { questionId: 1, selectedAnswer: 'B' }, res as unknown as Response);
    res.emit('close');
    await pending;
    expect(signal.aborted).toBe(true);
    expect(res.write).not.toHaveBeenCalled();
    expect(res.listenerCount('close')).toBe(0);
  });
});