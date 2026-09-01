import { Test, TestingModule } from '@nestjs/testing';
import { TheoryController } from './theory.controller';

describe('TheoryController', () => {
  let controller: TheoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TheoryController],
    }).compile();

    controller = module.get<TheoryController>(TheoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
