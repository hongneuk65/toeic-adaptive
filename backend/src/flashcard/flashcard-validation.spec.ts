import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateFolderDto, CreateFlashcardDto } from './dto/create-flashcard.dto';

describe('flashcard input validation', () => {
  it('rejects missing fields and whitespace instead of storing undefined as vocabulary', async () => {
    expect((await validate(plainToInstance(CreateFolderDto, { name: '   ' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(CreateFlashcardDto, {}))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(CreateFlashcardDto, { word: 'test', meaning: '   ' }))).length).toBeGreaterThan(0);
  });
  it('normalizes valid input and bounds resource usage', async () => {
    const card = plainToInstance(CreateFlashcardDto, { word: '  invoice  ', meaning: ' hóa đơn ' });
    expect(await validate(card)).toEqual([]);
    expect(card.word).toBe('invoice');
    expect(card.meaning).toBe('hóa đơn');
    expect((await validate(plainToInstance(CreateFlashcardDto, { word: 'a'.repeat(201), meaning: 'test' }))).length).toBeGreaterThan(0);
  });
});
