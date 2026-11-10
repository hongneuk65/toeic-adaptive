import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Only a live timed exam blocks general tutoring. Review still requires submission. */
export async function assertTutorHelpAccessible(prisma: PrismaService, userId: number) {
  const now = new Date();
  const pending = await prisma.examAttempt.findFirst({ where: { userId, submittedAt: null, OR: [
    { deadlineAt: { gt: now } },
    // Legacy attempts have no deadline; retain the same maximum window as answer access.
    { deadlineAt: null, startedAt: { gte: new Date(now.getTime() - 120 * 60_000) } },
  ] }, select: { id: true } });
  if (pending) throw new ForbiddenException('Nộp bài thi hoặc chờ hết giờ để sử dụng gia sư AI. Trợ giúp chỉ tạm khóa khi bài thi còn thời gian.');
}
