import { Test, TestingModule } from '@nestjs/testing';
import { TheoryService } from './theory.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';

describe('TheoryService', () => {
  let service: TheoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TheoryService,
        { provide: PrismaService, useValue: {} },
        { provide: MasteryQueueService, useValue: {} },
      ],
    }).compile();

    service = module.get<TheoryService>(TheoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
