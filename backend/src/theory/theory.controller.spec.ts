import { Test, TestingModule } from '@nestjs/testing';
import { TheoryController } from './theory.controller';
import { TheoryService } from './theory.service';

describe('TheoryController', () => {
  let controller: TheoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TheoryController],
      providers: [{ provide: TheoryService, useValue: {} }],
    }).compile();

    controller = module.get<TheoryController>(TheoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
