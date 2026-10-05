import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { Queue } from 'bullmq';
import { jest } from '@jest/globals';

describe('HealthController', () => {
  const database = { $queryRaw: jest.fn<() => Promise<unknown>>() };
  const ping = jest.fn<() => Promise<unknown>>();
  const queue = { getJobCounts: ping };
  const controller = new HealthController(database as unknown as PrismaService, queue as unknown as Queue);

  beforeEach(() => {
    database.$queryRaw.mockReset().mockResolvedValue([{ '?column?': 1 }]);
    ping.mockReset().mockResolvedValue('PONG');
  });

  it('checks both dependencies for readiness', async () => {
    await expect(controller.ready()).resolves.toEqual({ status: 'ok' });
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it.each(['database', 'redis'])('reports unavailable %s without exposing internal errors', async (dependency) => {
    (dependency === 'database' ? database.$queryRaw : ping).mockRejectedValue(new Error('private connection details'));
    await expect(controller.ready()).rejects.toThrow(ServiceUnavailableException);
    await expect(controller.ready()).rejects.toThrow('Dependencies unavailable');
    expect(controller.live()).toEqual({ status: 'ok' });
  });
});
