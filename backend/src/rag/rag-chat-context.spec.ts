import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RagChatService } from './rag-chat.service';
import { ChatTutorDto, TutorChatScopeDto } from './dto/rag.dto';

const question = { id: 7, part: 5, content: 'Current question', correctAnswer: 'A', optionA: 'first', optionB: 'second', optionC: 'third', optionD: 'fourth', skills: [{ skill: { id: 2, code: 'TENSE', name: 'Tense' } }] };
function setup() {
  const db = {
    examAttempt: { findFirst: jest.fn<any>().mockResolvedValue(null), findUnique: jest.fn<any>().mockResolvedValue({ id: 9, userId: 1, submittedAt: new Date(), questionIds: [7], questionSnapshot: [{ ...question, content: 'Snapshot question', correctAnswer: 'C', passage: 'Snapshot passage', explanation: 'Stored explanation', skills: [{ skillId: 2 }] }], answers: [{ selectedAnswer: 'B' }] }) },
    question: { findUnique: jest.fn<any>().mockResolvedValue(question) },
    skill: { findMany: jest.fn<any>().mockResolvedValue([{ id: 2, code: 'TENSE', name: 'Tense' }]) },
    aiChatMessage: { findMany: jest.fn<any>().mockResolvedValue([]), create: jest.fn<any>().mockImplementation(async ({ data }: any) => ({ ...data, id: 1, createdAt: new Date() })), deleteMany: jest.fn<any>().mockResolvedValue({ count: 1 }) },
  };
  const retriever = { retrieveContext: jest.fn<any>().mockResolvedValue([{ citationId: 'K1', title: 'Grammar', content: 'Rule', sourceUri: '/knowledge/1', version: 'v1' }]) };
  const llm = { generateText: jest.fn<any>().mockResolvedValue('Explanation') };
  const chat = new RagChatService(db as any, retriever as any, llm as any);
  return { db, llm, retriever, chat };
}

describe('Contextual tutor conversations', () => {
  it('uses the submitted snapshot and stored selection instead of a forged client selection', async () => {
    const { chat, db, llm, retriever } = setup();
    await chat.handleUserMessage({ userId: 1, message: 'Why is this wrong?', questionId: 7, attemptId: 9, selectedAnswer: 'D' });
    const prompt = llm.generateText.mock.calls[0][0].userPrompt;
    expect(prompt).toContain('Snapshot question');
    expect(prompt).toContain('Snapshot passage');
    expect(prompt).toContain('"correctAnswer":"C"');
    expect(prompt).toContain('"selectedAnswer":"B"');
    expect(prompt).toContain('submitted_attempt');
    expect(db.question.findUnique).not.toHaveBeenCalled();
    expect(retriever.retrieveContext).toHaveBeenCalledWith(expect.objectContaining({ part: 5, skillCode: 'TENSE', query: expect.stringContaining('Snapshot passage') }));
    expect(db.aiChatMessage.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 1, contextData: '{"questionId":7,"attemptId":9}' } }));
    for (const [call] of db.aiChatMessage.create.mock.calls) expect(call.data.contextData).toBe('{"questionId":7,"attemptId":9}');
  });
  it('uses practice choice and text context when no submitted attempt is supplied', async () => {
    const { chat, llm } = setup();
    await chat.handleUserMessage({ userId: 1, message: 'Explain B', questionId: 7, selectedAnswer: 'B' });
    expect(llm.generateText.mock.calls[0][0].userPrompt).toContain('"selectedAnswer":"B"');
    expect(llm.generateText.mock.calls[0][0].userPrompt).toContain('practice_input');
  });
  it('rejects access to another learner attempt before storing or generating messages', async () => {
    const { chat, db, llm } = setup();
    await expect(chat.handleUserMessage({ userId: 2, message: 'Explain', questionId: 7, attemptId: 9 })).rejects.toMatchObject({ status: 403 });
    await expect(chat.getChatHistory(2, { questionId: 7, attemptId: 9 })).rejects.toMatchObject({ status: 403 });
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();
    expect(llm.generateText).not.toHaveBeenCalled();
  });
  it('does not guess a missing or unrelated question', async () => {
    const { chat, db } = setup();
    db.question.findUnique.mockResolvedValue(null);
    await expect(chat.handleUserMessage({ userId: 1, message: 'Explain', questionId: 8 })).rejects.toMatchObject({ status: 404 });
    await expect(chat.handleUserMessage({ userId: 1, message: 'Explain', questionId: 8, attemptId: 9 })).rejects.toMatchObject({ status: 400 });
    expect(db.aiChatMessage.create).not.toHaveBeenCalled();
  });
  it('scopes reads and deletion to the current question and attempt, and keeps general chat separate', async () => {
    const { chat, db } = setup();
    await chat.getChatHistory(1, { questionId: 7, attemptId: 9 });
    await chat.clearChatHistory(1, { questionId: 7, attemptId: 9 });
    expect(db.aiChatMessage.deleteMany).toHaveBeenCalledWith({ where: { userId: 1, contextData: '{"questionId":7,"attemptId":9}' } });
    await chat.getChatHistory(1);
    const general = db.aiChatMessage.findMany.mock.calls.at(-1)[0].where;
    expect(general).toEqual({ userId: 1, OR: [{ contextData: '{"questionId":null,"attemptId":null}' }, { contextData: null }, { contextData: '{}' }] });
    await chat.clearChatHistory(1);
    expect(db.aiChatMessage.deleteMany.mock.calls.at(-1)[0].where).toEqual(general);
  });
  it('blocks both general and contextual chat/history during an unfinished exam', async () => {
    const { chat, db, llm } = setup();
    db.examAttempt.findFirst.mockResolvedValue({ id: 10 });
    await expect(chat.handleUserMessage({ userId: 1, message: 'Help' })).rejects.toMatchObject({ status: 403 });
    await expect(chat.getChatHistory(1, { questionId: 7 })).rejects.toMatchObject({ status: 403 });
    expect(llm.generateText).not.toHaveBeenCalled();
  });
  it('requires a valid question whenever an attempt scope is supplied', async () => {
    for (const value of [{ attemptId: '9' }, { questionId: '0' }, { questionId: 'abc' }, { questionId: '7', attemptId: '-1' }]) {
      expect((await validate(plainToInstance(TutorChatScopeDto, value))).length).toBeGreaterThan(0);
    }
    expect(await validate(plainToInstance(TutorChatScopeDto, { questionId: '7', attemptId: '9' }))).toHaveLength(0);
    expect(await validate(plainToInstance(ChatTutorDto, { message: 'Explain', questionId: 7, selectedAnswer: 'Z' }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(ChatTutorDto, { message: 'Explain' }))).toHaveLength(0);
  });
});
