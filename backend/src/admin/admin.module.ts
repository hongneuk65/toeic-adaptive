import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { KnowledgeEmbeddingService } from '../rag/knowledge-embedding.service';

import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

@Module({
  providers: [AdminService, AdminAccessGuard, AdminAuditInterceptor, KnowledgeEmbeddingService],
  controllers: [AdminController],
})
export class AdminModule {}
