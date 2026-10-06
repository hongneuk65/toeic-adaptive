import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RagModule } from '../rag/rag.module';
import {
  ReadingController,
  ReadingAdminController,
} from './reading.controller';
import { ReadingService } from './reading.service';
import { ReadingAiService } from './reading-ai.service';
import { ReadingProcessor } from './reading.processor';
@Module({
  imports: [
    PrismaModule,
    RagModule,
    BullModule.registerQueue({ name: 'reading-generation' }),
  ],
  controllers: [ReadingController, ReadingAdminController],
  providers: [ReadingService, ReadingAiService, ReadingProcessor],
})
export class ReadingModule {}
