import { Test, TestingModule } from '@nestjs/testing';
import { ExamService } from './exam.service';
import { PrismaService } from '../prisma/prisma.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';

describe('ExamService', () => {
  let service: ExamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExamService,
        { provide: PrismaService, useValue: {} },
        { provide: MasteryQueueService, useValue: {} },
      ],
    }).compile();

    service = module.get<ExamService>(ExamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('keeps the Reading budget separate from measured Listening for new deadlines', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const questions = [{id:1,part:1,audioUrl:'/one',stimulus:{audioDurationSeconds:15}}, {id:2,part:5}];
    const deadline = service['deadline']('FULL', [1,5], questions, start);
    expect(deadline.getTime()-start.getTime()).toBe((20+75*60)*1000);
    expect(service['deadline']('MINI', [1,5], questions, start).getTime()-start.getTime()).toBe((20+37.5*60)*1000);
    expect(service['deadline']('CUSTOM', [1,5], questions, start).getTime()-start.getTime()).toBe((20+20*60)*1000);
  });
});
