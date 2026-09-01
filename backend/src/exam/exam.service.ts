import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { ExamType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Injectable()
export class ExamService {
    constructor(private prisma: PrismaService) { }

    // 1. Khởi tạo bài thi và lấy danh sách câu hỏi (KHÔNG trả correctAnswer)
    async startExam(userId: number, dto: StartExamDto) {
        let questionsQuery: any = {};

        if (dto.examType === ExamType.PART_5) {
            questionsQuery = { where: { part: 5 }, take: 30 };
        } else if (dto.examType === ExamType.MINI) {
            questionsQuery = { take: 100 };
        } else {
            // FULL exam: 200 câu
            questionsQuery = { take: 200 };
        }

        // Lấy câu hỏi đề thi (ẩn hoàn toàn correctAnswer và explanation)
        const questions = await this.prisma.question.findMany({
            ...questionsQuery,
            orderBy: [{ part: 'asc' }, { id: 'asc' }],
            select: {
                id: true,
                part: true,
                passage: true,
                audioUrl: true,
                imageUrl: true,
                content: true,
                optionA: true,
                optionB: true,
                optionC: true,
                optionD: true,
            },
        });

        if (questions.length === 0) {
            throw new BadRequestException('Ngân hàng đề chưa có đủ câu hỏi cho bài thi này');
        }

        // Tạo lượt thi (attempt)
        const attempt = await this.prisma.examAttempt.create({
            data: {
                userId,
                examType: dto.examType,
            },
        });

        return {
            attemptId: attempt.id,
            examType: attempt.examType,
            startedAt: attempt.startedAt,
            totalQuestions: questions.length,
            questions,
        };
    }

    // 2. Chấm điểm bài thi sử dụng $transaction và createMany
    async submitExam(userId: number, dto: SubmitExamDto) {
        const attempt = await this.prisma.examAttempt.findUnique({
            where: { id: dto.attemptId },
        });

        if (!attempt) {
            throw new NotFoundException('Không tìm thấy lượt thi');
        }

        // Chặn người dùng nộp bài thi của người khác
        if (attempt.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền nộp bài thi này');
        }

        // Chặn nộp bài trùng lặp
        if (attempt.submittedAt) {
            throw new BadRequestException('Bài thi này đã được nộp trước đó');
        }

        const questionIds = dto.answers.map((a) => a.questionId);

        // Gom toàn bộ câu hỏi vào 1 câu SELECT duy nhất
        const questions = await this.prisma.question.findMany({
            where: { id: { in: questionIds } },
            select: { id: true, part: true, correctAnswer: true },
        });

        const questionMap = new Map(questions.map((q) => [q.id, q]));

        let listeningCorrect = 0;
        let readingCorrect = 0;

        // Chuẩn bị dữ liệu để batch insert
        const answerRecords = dto.answers.map((ans) => {
            const q = questionMap.get(ans.questionId);
            const isCorrect = q ? q.correctAnswer === ans.selectedAnswer : false;

            if (q) {
                if (q.part >= 1 && q.part <= 4) {
                    if (isCorrect) listeningCorrect++;
                } else {
                    if (isCorrect) readingCorrect++;
                }
            }

            return {
                attemptId: attempt.id,
                questionId: ans.questionId,
                selectedAnswer: ans.selectedAnswer,
                isCorrect,
            };
        });

        // Công thức tính điểm thô tạm thời cho giai đoạn MVP (tỉ lệ chuẩn trên thang 495 mỗi kỹ năng)
        const listeningScore = Math.round(
            (listeningCorrect / Math.max(1, (attempt.examType === ExamType.FULL ? 100 : listeningCorrect || 1))) * 495,
        );

        const readingScore = Math.round(
            (readingCorrect / Math.max(1, (attempt.examType === ExamType.FULL ? 100 : (attempt.examType === ExamType.PART_5 ? 30 : readingCorrect || 1)))) * 495,
        );
        const totalScore = listeningScore + readingScore;

        // Sử dụng $transaction để đảm bảo chèn 200 dòng answers và cập nhật attempt thành công đồng thời
        await this.prisma.$transaction([
            this.prisma.examAnswer.createMany({
                data: answerRecords,
            }),
            this.prisma.examAttempt.update({
                where: { id: attempt.id },
                data: {
                    submittedAt: new Date(),
                    listeningScore,
                    readingScore,
                    totalScore,
                },
            }),
        ]);

        return {
            attemptId: attempt.id,
            listeningCorrect,
            readingCorrect,
            totalCorrect: listeningCorrect + readingCorrect,
            listeningScore,
            readingScore,
            totalScore,
        };
    }

    // 3. Xem lại bài thi (Review)
    async getReview(userId: number, attemptId: number) {
        const attempt = await this.prisma.examAttempt.findUnique({
            where: { id: attemptId },
            include: {
                answers: {
                    include: {
                        question: true,
                    },
                },
            },
        });

        if (!attempt) {
            throw new NotFoundException('Không tìm thấy lượt thi');
        }

        if (attempt.userId !== userId) {
            throw new ForbiddenException('Bạn không có quyền xem bài thi này');
        }

        return attempt;
    }
}
