import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { AuthModule } from '../auth/auth.module';
import { RagModule } from '../rag/rag.module';
import { PrismaService } from '../prisma/prisma.service';
import { RequestBudgetGuard } from './request-budget.guard';

describe('request budget module wiring', () => {
  it('resolves decorated guards in both auth and RAG controller modules', async () => {
    const module = await Test.createTestingModule({ imports: [AuthModule, RagModule] })
      .overrideProvider(getQueueToken('request-budget')).useValue({ getBackend: () => ({}) })
      .overrideProvider(PrismaService).useValue({})
      .compile();
    expect(module.get(RequestBudgetGuard)).toBeDefined();
    await module.close();
  });
});
