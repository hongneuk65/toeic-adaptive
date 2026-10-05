import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RagRetrieverService } from './rag-retriever.service';
import { RagLlmService } from './rag-llm.service';
import { RagExplainerService } from './rag-explainer.service';
import { RagChatService } from './rag-chat.service';
import { RagRoadmapService } from './rag-roadmap.service';

@Module({
  imports: [PrismaModule],
  controllers: [RagController],
  providers: [
    RagService,
    RagRetrieverService,
    RagLlmService,
    RagExplainerService,
    RagChatService,
    RagRoadmapService,
  ],
  exports: [RagService, RagRetrieverService, RagExplainerService, RagChatService, RagRoadmapService],
})
export class RagModule {}
