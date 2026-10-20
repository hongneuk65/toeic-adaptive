import { jest } from '@jest/globals';
import { ReadingService } from './reading.service';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
import { ReadingAiService } from './reading-ai.service';

describe('Reading source documents', () => {
  it('reuses only exact imported passages, without exposing answer fields', async () => {
    const stimulus = {version:1,documents:[{id:'original',blocks:[]}]};
    const findFirst = jest.fn().mockResolvedValue({stimulus});
    const service = new ReadingService({question:{findFirst}} as unknown as PrismaService, {} as Queue, {} as ReadingAiService);
    expect(await service.sourceStimulus({origin:'SYSTEM',text:'Edited'})).toBeNull();
    expect(findFirst).not.toHaveBeenCalled();
    expect(await service.sourceStimulus({origin:'CRAWL',text:'Original text'})).toEqual(stimulus);
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({where:{part:7,passage:'Original text',explanation:{startsWith:'[santa-ednet:'}},select:{stimulus:true}}));
    findFirst.mockResolvedValue(null);
    expect(await service.sourceStimulus({origin:'CRAWL',text:'Changed text'})).toBeNull();
  });
});
