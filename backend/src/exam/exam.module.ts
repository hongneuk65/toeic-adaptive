import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MasteryQueueModule } from '../queue/mastery-queue.module'; // Ngày 18 Hook

@Module({
  imports: [PrismaModule, MasteryQueueModule],
  controllers: [ExamController],
  providers: [ExamService],
  exports: [ExamService],
})
export class ExamModule {}