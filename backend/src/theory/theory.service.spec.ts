import { Test, TestingModule } from '@nestjs/testing';
import { TheoryService } from './theory.service';

describe('TheoryService', () => {
  let service: TheoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TheoryService],
    }).compile();

    service = module.get<TheoryService>(TheoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
