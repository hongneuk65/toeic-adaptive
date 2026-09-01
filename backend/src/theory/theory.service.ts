import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Injectable()
export class TheoryService {
  constructor(private prisma: PrismaService) {}

  // 1. Lấy danh sách bài học theo Part (chỉ lấy thông tin cơ bản, không load content nặng)
  async getLessonsByPart(part: number) {
    return this.prisma.theoryLesson.findMany({
      where: { part },
      select: {
        id: true,
        title: true,
        part: true,
        skillId: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  // 2. Lấy nội dung chi tiết bài học kèm thông tin skill
  async getLessonDetail(id: number) {
    const lesson = await this.prisma.theoryLesson.findUnique({
      where: { id },
      include: {
        skill: true,
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học lý thuyết');
    }

    return lesson;
  }

  // 3. Lấy 5 câu mini-quiz của bài học (TUYỆT ĐỐI KHÔNG LỘ correctAnswer)
  async getLessonQuiz(lessonId: number) {
    const lesson = await this.prisma.theoryLesson.findUnique({
      where: { id: lessonId },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học lý thuyết');
    }

    // Lấy tối đa 5 câu hỏi thuộc skill của bài học này
    return this.prisma.question.findMany({
      where: {
        skills: {
          some: { skillId: lesson.skillId },
        },
      },
      take: 5,
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
        // Loại trừ correctAnswer và explanation để chống gian lận
      },
    });
  }

  // 4. Chấm điểm bài quiz (Chống N+1 query bằng "id: { in: [...] }")
  async submitQuiz(lessonId: number, dto: SubmitQuizDto) {
    const questionIds = dto.answers.map((a) => a.questionId);

    // Gom toàn bộ câu hỏi cần chấm vào 1 câu SQL SELECT duy nhất
    const questions = await this.prisma.question.findMany({
      where: {
        id: { in: questionIds },
      },
      select: {
        id: true,
        correctAnswer: true,
        explanation: true,
      },
    });

    if (questions.length !== questionIds.length) {
      throw new BadRequestException('Một hoặc nhiều questionId không hợp lệ');
    }

    // Đưa vào Map để tra cứu O(1) trong bộ nhớ
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    let correctCount = 0;
    const details = dto.answers.map((ans) => {
      const q = questionMap.get(ans.questionId)!;
      const isCorrect = q.correctAnswer === ans.selectedAnswer;
      if (isCorrect) correctCount++;

      return {
        questionId: ans.questionId,
        selectedAnswer: ans.selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        explanation: q.explanation,
      };
    });

    return {
      totalQuestions: dto.answers.length,
      correctCount,
      scorePercentage: Math.round((correctCount / dto.answers.length) * 100),
      details,
    };
  }
}