import { jest } from '@jest/globals';
import { ReadingService } from './reading.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingAiService } from './reading-ai.service';
import { Queue } from 'bullmq';

describe('source reading navigation', () => {
  it('allows source questions in their original order without inventing a MAIN requirement', async () => {
    const source = {id:20,userId:1,submittedAt:null,elapsedSeconds:0,version:{text:'An original source article.',questions:[0,1].map(i=>({type:'DETAIL',prompt:`Detail ${i}`,options:['a','b','c','d'],answer:0,explanation:'Source',evidenceRequired:false,evidence:[]}))}};
    const updateMany = jest.fn<(...args:unknown[])=>Promise<{count:number}>>().mockResolvedValue({count:1});
    const service = new ReadingService({readingAttempt:{updateMany}} as unknown as PrismaService, {} as Queue, {} as ReadingAiService);
    jest.spyOn(service,'ownedAttempt').mockResolvedValue(source as never);
    jest.spyOn(service,'attempt').mockResolvedValue({id:20} as never);
    await expect(service.progress(1,20,{answers:{},currentIndex:1,elapsedSeconds:5})).resolves.toEqual({id:20});
    source.version.questions[0].type='MAIN';
    await expect(service.progress(1,20,{answers:{},currentIndex:1,elapsedSeconds:5})).rejects.toThrow('ý chính');
  });
});
