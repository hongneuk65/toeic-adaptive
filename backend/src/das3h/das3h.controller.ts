import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Req,
    UseGuards,
    ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Das3hService } from './das3h.service';
import { AdaptiveSchedulerService } from './adaptive-scheduler.service';
import { MasteryQueueService } from '../queue/mastery-queue.service';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdaptiveAnswerDto, RecordMasteryDto } from './dto/adaptive-answer.dto';
import { getUserId } from '../common/user-id';

@Controller('das3h')
@UseGuards(AuthGuard('jwt'))
export class Das3hController {
    constructor(
        private readonly das3hService: Das3hService,
        private readonly adaptiveScheduler: AdaptiveSchedulerService,
        private readonly masteryQueueService: MasteryQueueService,
    ) { }

    /**
     * POST /das3h/predict
     * Dự đoán xác suất trả lời đúng của học sinh đối với 1 câu hỏi cụ thể
     */
    @Post('predict')
    async predictProb(
        @Req() req: any,
        @Body('questionId', ParseIntPipe) questionId: number,
    ) {
        const userId = getUserId(req);

        const prob = await this.das3hService.predictProbCorrect(
            userId,
            questionId,
        );

        return {
            questionId,
            predictedProbability: prob,
        };
    }

    /**
     * GET /das3h/adaptive-question?skillId=...
     * Lấy câu hỏi thích ứng tiếp theo rơi vào vùng ZPD (70% - 80%)
     */
    @Get('adaptive-question')
    async getAdaptiveQuestion(
        @Req() req: any,
        @Query('skillId', ParseIntPipe) skillId: number,
    ) {
        const userId = getUserId(req);

        return this.adaptiveScheduler.getNextAdaptiveQuestion(userId, skillId);
    }

    /**
     * POST /das3h/record
     * Ghi nhận kết quả làm bài của học sinh và tính lại điểm Mastery
     */
    @Post('record')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async recordAnswer(
        @Req() req: any,
        @Body() body: RecordMasteryDto,
    ) {
        const userId = getUserId(req);

        await this.das3hService.recordAndSync(
            userId,
            Number(body.questionId),
            Boolean(body.isCorrect),
            (body.skillIds || []).map(Number),
        );

        return {
            success: true,
            message: 'Đã lưu lịch sử làm bài và cập nhật độ thông thạo Mastery!',
        };
    }

    /**
     * POST /das3h/answer-adaptive
     * Nhận lựa chọn đáp án từ người học, tự động chấm đúng/sai,
     * đồng bộ hóa DAS3H và trả về đáp án chuẩn cùng giải thích.
     */
    @Post('answer-adaptive')
    async answerAdaptive(
        @Req() req: any,
        @Body() body: AdaptiveAnswerDto,
    ) {
        const userId = getUserId(req);

        return this.das3hService.checkAndRecordAnswer(
            userId,
            Number(body.questionId),
            body.selectedAnswer,
            body.skillId ? Number(body.skillId) : undefined,
        );
    }


    @Post('test-queue')
    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    async testQueue(@Req() req: any, @Body() body: RecordMasteryDto) {
        const userId = getUserId(req);

        // Đẩy vào hàng đợi nền và lập tức trả lời client ngay lập tức!
        await this.masteryQueueService.enqueueMasteryUpdate({
            userId,
            questionId: Number(body.questionId),
            isCorrect: Boolean(body.isCorrect),
            skillIds: body.skillIds || [],
        });

        return { message: 'Đã đưa vào hàng đợi nền thành công!' };
    }


}