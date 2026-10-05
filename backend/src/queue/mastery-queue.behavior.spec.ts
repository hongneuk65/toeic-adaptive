import { jest } from '@jest/globals';
import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { Job, Queue } from 'bullmq';
import { Das3hService } from '../das3h/das3h.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueModule } from './mastery-queue.module';
import { MasteryQueueService, UpdateMasteryJobData } from './mastery-queue.service';
import { MasteryProcessor } from './mastery.processor';

const event: UpdateMasteryJobData = { userId: 1, questionId: 2, isCorrect: true, skillIds: [3] };

describe('Mastery queue module wiring', () => {
  let module: TestingModule;

  afterEach(async () => { await module?.close(); });

  it('resolves the worker with the exported DAS3H service and preserves retry IDs', async () => {
    module = await Test.createTestingModule({
      imports: [
        BullModule.forRoot({ extraOptions: { manualRegistration: true } }),
        MasteryQueueModule,
      ],
    })
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(getQueueToken('mastery-queue')).useValue({})
      .compile();
    await module.init();
    const das3h = module.get(Das3hService);
    const record = jest.spyOn(das3h, 'recordAndSync').mockResolvedValue();
    const processor = module.get(MasteryProcessor);
    await processor.process({ id: 'retry-id', data: event } as Job<UpdateMasteryJobData>);
    expect(record).toHaveBeenCalledWith(1, 2, true, [3], 'retry-id');

    record.mockRejectedValueOnce(new Error('transaction failed'));
    await expect(processor.process({ id: 'retry-id', data: event } as Job<UpdateMasteryJobData>))
      .rejects.toThrow('transaction failed');
  });
});

describe('Mastery queue delivery options', () => {
  const queue = {
    add: jest.fn<Queue['add']>(),
    addBulk: jest.fn<Queue['addBulk']>(),
  };
  let service: MasteryQueueService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new MasteryQueueService(queue as unknown as Queue);
  });

  it('assigns independent IDs and retry/backoff options to single and bulk events', async () => {
    await service.enqueueMasteryUpdate(event);
    await service.enqueueBulkMasteryUpdate([event, event]);
    const options = [queue.add.mock.calls[0][2], ...queue.addBulk.mock.calls[0][0].map((job) => job.opts)];
    for (const opts of options) {
      expect(opts).toEqual({
        jobId: expect.any(String), attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true, removeOnFail: false,
      });
    }
    expect(new Set(options.map((opts) => opts?.jobId)).size).toBe(3);
    expect(queue.add.mock.calls[0].slice(0, 2)).toEqual(['update-mastery', event]);
    expect(queue.addBulk.mock.calls[0][0].map(({ name, data }) => ({ name, data })))
      .toEqual([event, event].map((data) => ({ name: 'update-mastery', data })));
  });

  it('does not enqueue an empty batch', async () => {
    await service.enqueueBulkMasteryUpdate([]);
    expect(queue.addBulk).not.toHaveBeenCalled();
  });
});