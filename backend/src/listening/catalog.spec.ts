import { jest } from '@jest/globals';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ListeningCatalogQueryDto } from './listening.dto';
import { ListeningService } from './listening.service';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAsrProvider } from './local-asr.provider';
import { Queue } from 'bullmq';

describe('listening catalog', () => {
  it('bounds query parameters before they reach database pagination', async () => {
    expect(await validate(plainToInstance(ListeningCatalogQueryDto, { page:'2', pageSize:'24', kind:'AUDIO' }))).toEqual([]);
    for (const query of [{page:0}, {pageSize:101}, {kind:'OTHER'}, {page:'x'}]) {
      expect((await validate(plainToInstance(ListeningCatalogQueryDto, query))).length).toBeGreaterThan(0);
    }
  });
  it('searches the whole accessible library and returns deterministic pages', async () => {
    const findMany = jest.fn<(...args: unknown[]) => Promise<unknown[]>>().mockResolvedValue([{id:7}]);
    const count = jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(1577);
    const db = { listeningSource:{findMany,count}, listeningSession:{findMany:async()=>[]}, listeningSettings:{upsert:async()=>({})} };
    const service = new ListeningService(db as unknown as PrismaService, {} as Queue, {available:()=>false} as LocalAsrProvider);
    const result = await service.list(10,{page:2,pageSize:24,search:' Santa ',kind:'AUDIO'});
    expect(result.pagination).toEqual({page:2,pageSize:24,total:1577,totalPages:66});
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({skip:24,take:24,orderBy:[{createdAt:'desc'},{id:'desc'}],
      where:expect.objectContaining({deletedAt:null,OR:[{ownerId:10},{ownerId:null,published:true}],kind:'AUDIO',title:{contains:'Santa',mode:'insensitive'}})}));
    expect(count.mock.calls[0][0]).toEqual({where:(findMany.mock.calls[0][0] as {where:unknown}).where});
  });
});
