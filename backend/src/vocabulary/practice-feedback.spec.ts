import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VocabularyService } from './vocabulary.service';
import { VocabularyPracticeFeedbackDto } from './vocabulary.dto';
const output = { feedback: 'Use the target word in a complete sentence.', correctedSentence: 'Please send the invoice.', followUpQuestion: 'When do you send an invoice?' };
function setup() {
 const db = { examAttempt: { findFirst: jest.fn<any>().mockResolvedValue(null) }, flashcard: { findUnique: jest.fn<any>().mockResolvedValue({ id: 1, word: 'invoice', meaning: 'hoa don', userId: 1, folder: { private: true, userId: 1 } }) } };
 const llm = { generateText: jest.fn<any>().mockResolvedValue(JSON.stringify(output)) };
 return { db, llm, service: new VocabularyService(db as any, llm as any) };
}
describe('Vocabulary spoken sentence feedback', () => {
 it('returns bounded text feedback with explicit no-pronunciation-assessment metadata', async () => {
  const { service, llm } = setup();
  expect(await service.practiceFeedback(1, { cardId: 1, response: 'Send invoice.' })).toEqual({ ...output, generationStatus: 'generated', pronunciationAssessed: false });
  expect(llm.generateText).toHaveBeenCalledWith(expect.objectContaining({ allowFallback: false, userPrompt: expect.stringContaining('Send invoice.') }));
 });
 it('does not reveal private flashcards to another learner', async () => {
  const { service, llm } = setup();
  await expect(service.practiceFeedback(2, { cardId: 1, response: 'Help.' })).rejects.toMatchObject({ status: 404 });
  expect(llm.generateText).not.toHaveBeenCalled();
 });
 it('blocks unfinished exams before generation and rechecks after generation', async () => {
  const { service, db, llm } = setup();
  db.examAttempt.findFirst.mockResolvedValue({ id: 4 });
  await expect(service.practiceFeedback(1, { cardId: 1, response: 'An invoice.' })).rejects.toMatchObject({ status: 403 });
  expect(llm.generateText).not.toHaveBeenCalled();
  db.examAttempt.findFirst.mockResolvedValueOnce(null).mockResolvedValue({ id: 4 });
  await expect(service.practiceFeedback(1, { cardId: 1, response: 'An invoice.' })).rejects.toMatchObject({ status: 403 });
 });
 it('fails clearly without a provider and rejects malformed or score-bearing output', async () => {
  const { service, llm } = setup();
  llm.generateText.mockRejectedValueOnce(new Error('No key'));
  await expect(service.practiceFeedback(1, { cardId: 1, response: 'An invoice.' })).rejects.toMatchObject({ status: 503 });
  for (const raw of ['not JSON', JSON.stringify({ ...output, score: 90 }), JSON.stringify({ ...output, feedback: '' })]) {
   llm.generateText.mockResolvedValueOnce(raw);
   await expect(service.practiceFeedback(1, { cardId: 1, response: 'An invoice.' })).rejects.toMatchObject({ status: 503 });
  }
 });
 it('limits repeated requests and rejects invalid input at the API boundary', async () => {
  const { service } = setup();
  for (let i=0;i<10;i++) await service.practiceFeedback(1, { cardId: 1, response: 'An invoice.' });
  await expect(service.practiceFeedback(1, { cardId: 1, response: 'An invoice.' })).rejects.toMatchObject({ status: 429 });
  for (const value of [{ cardId: 0, response: 'Hi' }, { cardId: 1, response: ' ' }, { cardId: 1, response: 'a'.repeat(1001) }]) expect((await validate(plainToInstance(VocabularyPracticeFeedbackDto, value))).length).toBeGreaterThan(0);
 });
});
