import { MasteryOutbox } from '@prisma/client';
import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from '../das3h/das3h.service';
import { UpdateMasteryJobData } from './mastery-queue.service';

@Injectable()
export class MasteryOutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MasteryOutboxService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  constructor(private readonly prisma: PrismaService, private readonly das3h: Das3hService) {}
  onModuleInit() {
    this.timer = setInterval(() => { void this.flush().catch(error => this.logger.error('Outbox poll failed', error)); }, 5000);
    this.timer.unref();
  }
  onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
  async flush() {
    if (this.running) return;
    this.running = true;
    try {
      const events = await this.prisma.$queryRaw<MasteryOutbox[]>`
        SELECT * FROM (
          SELECT DISTINCT ON (payload->>'userId') * FROM "MasteryOutbox"
          WHERE "processedAt" IS NULL
          ORDER BY payload->>'userId', "createdAt", id
        ) AS earliest
        WHERE "nextAttemptAt" <= NOW()
        ORDER BY "createdAt", id LIMIT 50
      `;
      for (const candidate of events) {
        const data = candidate.payload as unknown as UpdateMasteryJobData & { occurredAt?: string; itemDifficulty?: number };
        try {
          // The user lock is shared with direct learning writes and all API replicas.
          // Re-read the earliest pending event AFTER locking; a retry blocks later user events.
          await this.prisma.$transaction(async tx => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(${data.userId}::bigint)`;
            for (let batchIndex = 0; batchIndex < 10; batchIndex++) {
              const event = await tx.masteryOutbox.findFirst({
                where: { processedAt: null, payload: { path: ['userId'], equals: data.userId } },
                orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
              });
              if (!event || event.nextAttemptAt.getTime() > Date.now()) return;
              const eventData = event.payload as unknown as typeof data;
              const historical = {
                occurredAt: eventData.occurredAt ?? event.createdAt.toISOString(),
                itemDifficulty: eventData.itemDifficulty ?? (await tx.question.findUnique({ where: { id: eventData.questionId }, select: { itemDifficulty: true } }))?.itemDifficulty ?? 0,
              };
              await this.das3h.recordAndSync(eventData.userId, eventData.questionId, eventData.isCorrect, eventData.skillIds, event.id, historical, tx);
              await tx.masteryOutbox.update({ where: { id: event.id }, data: { processedAt: new Date(), lastError: null } });
            }
          }, { timeout: 15000 });
        } catch (error) {
          await this.prisma.masteryOutbox.updateMany({ where: { id: candidate.id, processedAt: null }, data: {
            attempts: {increment: 1}, lastError: String(error).slice(0, 1000),
            nextAttemptAt: new Date(Date.now() + Math.min(3600000, 5000 * 2 ** Math.min(candidate.attempts, 10))),
          } });
          this.logger.warn(`Mastery event ${candidate.id} will retry`);
        }
      }
    } finally { this.running = false; }
  }
}
