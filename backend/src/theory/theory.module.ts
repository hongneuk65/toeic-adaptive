import { Module } from '@nestjs/common';
import { TheoryService } from './theory.service';
import { TheoryController } from './theory.controller';

@Module({
  providers: [TheoryService],
  controllers: [TheoryController]
})
export class TheoryModule {}
