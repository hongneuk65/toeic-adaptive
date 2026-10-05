import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';

export interface UpdateMasteryJobData {
    userId: number;
    questionId: number;
    isCorrect: boolean;
    skillIds: number[];
}

@Injectable()
export class MasteryQueueService {
    private readonly logger = new Logger(MasteryQueueService.name);

    constructor(
        @InjectQueue('mastery-queue') private readonly masteryQueue: Queue,
    ) { }

    /**
     * Đẩy một tác vụ cập nhật DAS3H vào hàng đợi nền
     */
    async enqueueMasteryUpdate(data: UpdateMasteryJobData) {
        try {
            await this.masteryQueue.add('update-mastery', data, {
                jobId: randomUUID(),
                attempts: 3, // Thử lại tối đa 3 lần nếu có sự cố
                backoff: {
                    type: 'exponential',
                    delay: 1000,
                },
                removeOnComplete: true, // Xóa job khi hoàn thành để tiết kiệm RAM Redis
                removeOnFail: false,   // Giữ lại job lỗi để debug
            });
        } catch (error) {
            this.logger.error('Lỗi khi đẩy job vào BullMQ:', error);
        }
    }

    /**
     * Đẩy hàng loạt job cho đề thi nhiều câu (ví dụ bài thi 200 câu)
     */
    async enqueueBulkMasteryUpdate(jobs: UpdateMasteryJobData[]) {
        if (!jobs || jobs.length === 0) return;

        try {
            const bullJobs = jobs.map((data) => ({
                name: 'update-mastery',
                data,
                opts: {
                    jobId: randomUUID(),
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 1000 },
                    removeOnComplete: true,
                    removeOnFail: false,
                },
            }));

            await this.masteryQueue.addBulk(bullJobs);
            this.logger.log(`Đã đẩy ${jobs.length} câu hỏi vào hàng đợi nền.`);
        } catch (error) {
            this.logger.error('Lỗi khi đẩy bulk jobs vào BullMQ:', error);
        }
    }
}