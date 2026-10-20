import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VocabularyService, vocabularyVariants, normalizeVocabularyWord } from './vocabulary.service';
import { SaveVocabularyDto, VocabularyLookupDto } from './vocabulary.dto';
import { PrismaService } from '../prisma/prisma.service';
import { RagLlmService } from '../rag/rag-llm.service';
describe('selection vocabulary',()=>{
  it('validates bounded lookup/save requests',async()=>{
    expect(await validate(plainToInstance(VocabularyLookupDto,{word:' contract '}))).toEqual([]);
    for(const word of ['', 'x'.repeat(121), 'word '.repeat(13)])expect((await validate(plainToInstance(VocabularyLookupDto,{word}))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(SaveVocabularyDto,{word:'contract',meaning:' ',folderId:0}))).length).toBeGreaterThan(0);
  });
  it('normalizes identity and offers inflection candidates without replacing exact dictionary matches',()=>{
    expect(normalizeVocabularyWord('  CONTRACT  ')).toBe('contract');
    expect(vocabularyVariants('renewed')).toContain('renew');
    expect(vocabularyVariants('running')).toContain('run');
  });
  it('refuses saving to a folder not owned by the learner',async()=>{
    const tx={$queryRaw:jest.fn().mockResolvedValue([]),flashcardFolder:{findFirst:jest.fn().mockResolvedValue(null)}};
    const db={$transaction:async(callback:(value:unknown)=>unknown)=>callback(tx)};
    const service=new VocabularyService(db as unknown as PrismaService,{} as RagLlmService);
    await expect(service.save(1,{word:'contract',meaning:'hợp đồng',folderId:22})).rejects.toThrow('thư mục của bạn');
  });
});
