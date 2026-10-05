import { Test, TestingModule } from '@nestjs/testing';
import { FlashcardService } from './flashcard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FlashcardService', () => {
  let service: FlashcardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FlashcardService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<FlashcardService>(FlashcardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
