import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Das3hService } from '../das3h/das3h.service';
import type { UpdateMasteryJobData } from './mastery-queue.service';

@Processor('mastery-queue')
export class MasteryProcessor extends WorkerHost {
  constructor(private readonly das3hService: Das3hService) { super(); }

  async process(job: Job<UpdateMasteryJobData>): Promise<void> {
    const { userId, questionId, isCorrect, skillIds } = job.data;
    await this.das3hService.recordAndSync(userId, questionId, isCorrect, skillIds, job.id);
  }
}