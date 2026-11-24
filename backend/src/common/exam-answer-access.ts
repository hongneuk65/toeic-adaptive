import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Grading endpoints share the exam boundary; hiding a button is insufficient. */
export async function assertQuestionAnswersAccessible(prisma: PrismaService, userId: number, questionIds: number[]) {
  if (!questionIds.length) return;
  const now = new Date();
  const openExam = await prisma.examAttempt.findFirst({
    where: { userId, submittedAt: null, questionIds: { hasSome: questionIds }, OR: [
      { deadlineAt: { gt: now } },
      { deadlineAt: null, startedAt: { gte: new Date(now.getTime() - 120 * 60_000) } },
    ] },
    select: { id: true },
  });
  if (openExam) throw new ForbiddenException('Nộp bài thi đang làm trước khi xem đáp án hoặc luyện lại câu hỏi này.');
}

/** Questions inside an unsubmitted, still-open exam; listing views must hide them too. */
export async function openExamQuestionIds(prisma: PrismaService, userId: number, now = new Date()) {
  const open = await prisma.examAttempt.findMany({
    where: { userId, submittedAt: null, OR: [
      { deadlineAt: { gt: now } },
      { deadlineAt: null, startedAt: { gte: new Date(now.getTime() - 120 * 60_000) } },
    ] },
    select: { questionIds: true },
  });
  return new Set(open.flatMap(attempt => attempt.questionIds));
}
