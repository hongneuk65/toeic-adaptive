import { jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FlashcardService } from './flashcard.service';
import { PracticeVocabularyDto } from './dto/practice-vocabulary.dto';

const input = { attemptId: '1d2f5260-7ce8-46b8-a60f-d66bdc97e491', mode: 'quiz' as const, response: 'invoice', elapsedMs: 1000 };
function setup() {
  const rows = new Map<string, any>();
  const db = {
    examAttempt: { findFirst: jest.fn<any>().mockResolvedValue(null) },
    flashcard: { findUnique: jest.fn<any>().mockResolvedValue({ id: 7, folderId: 2, word: 'invoice', meaning: 'hóa đơn', phonetic: '/invois/', example: 'Please send the invoice.' }) },
    flashcardReview: { upsert: jest.fn<any>() },
    flashcardRecallEvent: { create: jest.fn<any>() },
    learningAttempt: {
      findUnique: jest.fn<any>().mockImplementation(async ({ where }: any) => rows.get(where.id) ?? null),
      create: jest.fn<any>().mockImplementation(async ({ data }: any) => { rows.set(data.id, data); return data; }),
    },
    $executeRaw: jest.fn<any>().mockResolvedValue(1),
    $transaction: jest.fn<any>(),
  };
  db.$transaction.mockImplementation(async (run: any) => run(db));
  const service = new FlashcardService(db as never);
  const folder = jest.spyOn(service, 'getFolderDetail').mockResolvedValue({ id: 2, name: 'Words', count: 1, authorName: 'Library', isOwner: false } as never);
  return { db, service, folder, rows };
}

describe('Vocabulary quiz and dictation practice', () => {
  it('grades the answer on the server and records a separate immutable quiz attempt', async () => {
    const { db, service, folder } = setup();
    const result = await service.practice(1, 7, { ...input, response: '  INVOICE  ' });
    expect(result).toMatchObject({ correct: true, correctAnswer: 'invoice', meaning: 'hóa đơn', mode: 'quiz', schedulingUpdated: false });
    expect(folder).toHaveBeenCalledWith(2, 1);
    expect(db.learningAttempt.create).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: 1, scopeId: 7, kind: 'VOCAB_QUIZ', id: `vocabulary-practice-1-${input.attemptId}`, result: expect.objectContaining({ correct: true }) }) });
    expect(db.flashcardReview.upsert).not.toHaveBeenCalled();
    expect(db.flashcardRecallEvent.create).not.toHaveBeenCalled();
  });
  it('records dictation errors and unknown responses without changing the typed recall curve', async () => {
    const { service, db } = setup();
    expect(await service.practice(1, 7, { ...input, mode: 'dictation', response: 'receipt' })).toMatchObject({ correct: false, correctAnswer: 'invoice', mode: 'dictation', response: 'receipt' });
    expect(await service.practice(1, 7, { ...input, attemptId: 'a6ca06ef-8c65-40c1-9b2c-a2d31ae23738', mode: 'dictation', response: '' })).toMatchObject({ correct: false, response: '' });
    expect(db.learningAttempt.create.mock.calls[0][0].data.kind).toBe('VOCAB_DICTATION');
    expect(db.flashcardReview.upsert).not.toHaveBeenCalled();
    expect(db.flashcardRecallEvent.create).not.toHaveBeenCalled();
  });
  it('replays the same attempt without adding a second record', async () => {
    const { service, db } = setup();
    const first = await service.practice(1, 7, input);
    const second = await service.practice(1, 7, { ...input, response: ' INVOICE ' });
    expect(second).toEqual(first);
    expect(db.learningAttempt.create).toHaveBeenCalledTimes(1);
  });
  it('rejects a reused attempt identifier with a different answer, task or timing', async () => {
    const { service, db } = setup();
    await service.practice(1, 7, input);
    for (const change of [{ response: 'receipt' }, { mode: 'dictation' as const }, { elapsedMs: 2000 }]) {
      await expect(service.practice(1, 7, { ...input, ...change })).rejects.toMatchObject({ status: 409 });
    }
    expect(db.learningAttempt.create).toHaveBeenCalledTimes(1);
  });
  it('keeps learner attempt namespaces independent', async () => {
    const { service, db } = setup();
    await service.practice(1, 7, input);
    await service.practice(2, 7, input);
    expect(db.learningAttempt.create.mock.calls.map(([call]) => call.data.userId)).toEqual([1, 2]);
  });
  it('blocks unfinished exams before accessing question content', async () => {
    const { service, db } = setup();
    db.examAttempt.findFirst.mockResolvedValue({ id: 3 });
    await expect(service.practice(1, 7, input)).rejects.toMatchObject({ status: 403 });
    expect(db.flashcard.findUnique).not.toHaveBeenCalled();
    expect(db.learningAttempt.create).not.toHaveBeenCalled();
  });
  it('does not grade missing or private cards', async () => {
    const { service, db, folder } = setup();
    db.flashcard.findUnique.mockResolvedValueOnce(null);
    await expect(service.practice(1, 7, input)).rejects.toMatchObject({ status: 404 });
    folder.mockRejectedValueOnce(new NotFoundException());
    await expect(service.practice(1, 7, input)).rejects.toMatchObject({ status: 404 });
    expect(db.learningAttempt.create).not.toHaveBeenCalled();
  });
  it('validates mode, UUID, response limits and elapsed timing', async () => {
    expect(await validate(plainToInstance(PracticeVocabularyDto, input))).toHaveLength(0);
    expect(await validate(plainToInstance(PracticeVocabularyDto, { ...input, response: '' }))).toHaveLength(0);
    for (const change of [{ mode: 'typed' }, { attemptId: 'bad' }, { response: 'x'.repeat(201) }, { response: undefined }, { elapsedMs: -1 }, { elapsedMs: 1.5 }, { elapsedMs: 86400001 }]) {
      expect((await validate(plainToInstance(PracticeVocabularyDto, { ...input, ...change }))).length).toBeGreaterThan(0);
    }
  });
});
