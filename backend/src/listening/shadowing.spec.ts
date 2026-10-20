import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { ListeningService } from './listening.service';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
import { LocalAsrProvider } from './local-asr.provider';

describe('shadowing script', () => {
  it('reveals the current owned segment only in speaking mode', async () => {
    const service = new ListeningService({} as PrismaService, {} as Queue, {} as LocalAsrProvider);
    const own = jest.spyOn(service,'ownedSession').mockResolvedValue({mode:'DICTATION',currentIndex:0} as never);
    jest.spyOn(service,'units').mockResolvedValue([{id:4,text:'Source speech.',start:0,end:5}] as never);
    await expect(service.shadowingScript(7,1)).rejects.toBeInstanceOf(BadRequestException);
    own.mockResolvedValue({mode:'SPEAK',currentIndex:0} as never);
    expect(await service.shadowingScript(7,1)).toEqual({unitId:4,text:'Source speech.',start:0,end:5});
    expect(own).toHaveBeenCalledWith(7,1);
  });
});
