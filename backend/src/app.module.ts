import { HistoryModule } from './history/history.module';
import { VocabularyModule } from './vocabulary/vocabulary.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { FlashcardModule } from './flashcard/flashcard.module';
import { TheoryModule } from './theory/theory.module';
import { ExamModule } from './exam/exam.module';
import { MasteryModule } from './mastery/mastery.module';
import { Das3hModule } from './das3h/das3h.module';
import { RagModule } from './rag/rag.module';
import { BullModule } from '@nestjs/bullmq';
import { MasteryQueueModule } from './queue/mastery-queue.module';
import { HealthController } from './health/health.controller';
import { ListeningModule } from './listening/listening.module';
import { ReadingModule } from './reading/reading.module';

@Module({
  controllers: [HealthController],
  imports: [
    PrismaModule,
    AuthModule,
    AdminModule,
    FlashcardModule,
    TheoryModule,
    ExamModule,
    MasteryModule,
    Das3hModule,
    RagModule,
    ListeningModule,
    ReadingModule,
    VocabularyModule,
    HistoryModule,
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    }),
    MasteryQueueModule,
  ],
})
export class AppModule {}
