import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { FlashcardModule } from './flashcard/flashcard.module';
import { TheoryModule } from './theory/theory.module';
import { ExamModule } from './exam/exam.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AdminModule,
    FlashcardModule,
    TheoryModule,
    ExamModule,
  ],
})
export class AppModule {}