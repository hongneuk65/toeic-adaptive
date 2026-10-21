import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Shared by free chat and question explanations. Expiry alone does not finalize an exam. */
export async function assertTutorHelpAccessible(prisma: PrismaService, userId: number) {
  const pending = await prisma.examAttempt.findFirst({ where: { userId, submittedAt: null }, select: { id: true } });
  if (pending) throw new ForbiddenException('Nộp bài thi đang làm trước khi sử dụng gia sư AI, kể cả bài đã hết giờ.');
}
