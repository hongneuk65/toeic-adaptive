import { RagModule } from '../rag/rag.module';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VocabularyController } from './vocabulary.controller';
import { VocabularyService } from './vocabulary.service';
@Module({ imports: [PrismaModule, RagModule], controllers: [VocabularyController], providers: [VocabularyService] })
export class VocabularyModule {}
