import { Test, TestingModule } from '@nestjs/testing';
import { RagRoadmapService } from './rag-roadmap.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RagRoadmapService', () => {
  let service: RagRoadmapService;

  const mockPrisma = {
    user: { findUnique: () => Promise.resolve({ ability: 0 }) },
    studentSkillHistory: { findMany: () => Promise.resolve([]) },
    das3hWeights: { findMany: () => Promise.resolve([]) },
    skill: {
      findMany: () =>
        Promise.resolve([
          { id: 1, code: 'P5_PARTS_OF_SPEECH', name: 'Từ loại', part: 5, category: 'Grammar', easiness: Math.log(0.3 / 0.7) },
          { id: 2, code: 'P5_VERB_TENSES_VOICE', name: 'Thì động từ', part: 5, category: 'Grammar', easiness: Math.log(0.55 / 0.45) },
          { id: 3, code: 'P1_PHOTO_OBJECT', name: 'Mô tả đồ vật', part: 1, category: 'Listening', easiness: Math.log(0.85 / 0.15) },
        ]),
    },
    userSkillMastery: {
      findMany: () =>
        Promise.resolve([
          { userId: 1, skillId: 1, masteryScore: 0.99, practiceCount: 4 },
          { userId: 1, skillId: 2, masteryScore: 0.99, practiceCount: 8 },
          { userId: 1, skillId: 3, masteryScore: 0.99, practiceCount: 15 },
        ]),
    },
    theoryLesson: {
      findMany: () =>
        Promise.resolve([
          { id: 101, title: 'Bài học từ loại', part: 5, skillId: 1 },
        ]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RagRoadmapService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RagRoadmapService>(RagRoadmapService);
  });

  it('should categorize skills into P0, P1, P2 correctly', async () => {
    const result = await service.getPersonalizedRoadmap(1);

    expect(result.summary.totalSkillsTracked).toBe(3);
    expect(result.summary.criticalCount).toBe(1);
    expect(result.summary.focusCount).toBe(1);
    expect(result.summary.masteredCount).toBe(1);

    // P0 should come first
    expect(result.prioritySteps[0].priority).toBe('P0_CRITICAL');
    expect(result.prioritySteps[0].skillCode).toBe('P5_PARTS_OF_SPEECH');
    expect(result.prioritySteps[0].recommendedLesson?.id).toBe(101);

    // P1 should be second
    expect(result.prioritySteps[1].priority).toBe('P1_FOCUS');

    // P2 should be last
    expect(result.prioritySteps[2].priority).toBe('P2_ADVANCED');
  });
});

