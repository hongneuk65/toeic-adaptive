import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RagController } from './rag.controller';
import { RagService } from './rag.service';
import { RagRetrieverService } from './rag-retriever.service';
import { RagLlmService } from './rag-llm.service';
import { RagExplainerService } from './rag-explainer.service';
import { RagChatService } from './rag-chat.service';
import { RagRoadmapService } from './rag-roadmap.service';
import { RequestBudgetModule } from '../common/request-budget.guard';
import { Das3hModule } from '../das3h/das3h.module';
import { TutorContextService } from './tutor-context.service';
import { TutorKnowledgeService } from './tutor-knowledge.service';
import { LearnerEvidenceService } from './learner-evidence.service';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';
import { MasteryModule } from '../mastery/mastery.module';
import { LearnerContextService } from './learner-context.service';
import { ScreenContextService } from './screen-context.service';

@Module({
  imports: [PrismaModule, RequestBudgetModule, Das3hModule, MasteryModule],
  controllers: [RagController],
  providers: [
    TutorContextService, TutorKnowledgeService, LearnerEvidenceService, KnowledgeEmbeddingService, LearnerContextService, ScreenContextService,
    RagService,
    RagRetrieverService,
    RagLlmService,
    RagExplainerService,
    RagChatService,
    RagRoadmapService,
  ],
  exports: [RagService, RagRetrieverService, RagExplainerService, RagChatService, RagRoadmapService, RagLlmService],
})
export class RagModule {}
