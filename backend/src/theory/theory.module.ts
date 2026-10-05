import { Module } from '@nestjs/common';
import { TheoryService } from './theory.service';
import { TheoryController } from './theory.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MasteryQueueModule } from '../queue/mastery-queue.module'; // Import hàng đợi

@Module({
  imports: [PrismaModule, MasteryQueueModule],
  controllers: [TheoryController],
  providers: [TheoryService],
  exports: [TheoryService],
})
export class TheoryModule { }
