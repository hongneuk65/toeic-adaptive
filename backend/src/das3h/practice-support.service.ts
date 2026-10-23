import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { assertQuestionAnswersAccessible } from '../common/exam-answer-access';
import { topicForLesson, topicForSkill } from '../mastery/learning-topics';
import { supportStepsForSkill } from './practice-support.policy';

@Injectable()
export class PracticeSupportService {
  constructor(private readonly prisma: PrismaService) {}

  async getSupport(userId: number, questionId: number, skillId: number, attemptId: string) {
    // Read only: requesting help must not create another learning observation.
    const attempt = await this.prisma.learningAttempt.findUnique({
      where: { id: `adaptive-${userId}-${attemptId}` },
    });
    if (!attempt || attempt.userId !== userId || attempt.kind !== 'adaptive' || attempt.scopeId !== questionId) {
      throw new NotFoundException('Chưa tìm thấy lượt luyện đã ghi nhận cho câu hỏi này.');
    }
    // The original skill is committed in the attempt hash. Do not let clients
    // replace it with a different skill and receive unrelated learning advice.
    const matchesSkill = ['A', 'B', 'C', 'D'].some(answer =>
      createHash('sha256').update(JSON.stringify([questionId, answer, skillId])).digest('hex') === attempt.payloadHash);
    if (!matchesSkill) throw new BadRequestException('Kỹ năng không khớp lượt luyện đã ghi nhận.');
    const result = attempt.result as { isCorrect?: unknown } | null;
    if (!result || result.isCorrect !== false) {
      throw new BadRequestException('Hướng dẫn củng cố dành cho câu trả lời chưa đúng.');
    }
    await assertQuestionAnswersAccessible(this.prisma, userId, [questionId]);
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      select: { skills: { where: { skillId }, select: { skill: { select: { id: true, code: true, name: true } } } } },
    });
    const skill = question?.skills[0]?.skill;
    if (!skill) throw new NotFoundException('Câu hỏi hiện không còn thuộc kỹ năng này.');
    const lessons = await this.prisma.theoryLesson.findMany({
      where: { skillId }, select: { id: true, title: true, part: true }, orderBy: { id: 'asc' },
    });
    const topic = topicForSkill(skill.code);
    const lesson = topic ? lessons.find(item => topicForLesson({ ...item, skill: { code: skill.code } }).id === topic.id) : undefined;
    return {
      version: 'practice-support-v1' as const,
      skillId: skill.id,
      skillName: skill.name,
      steps: supportStepsForSkill(skill.code),
      lesson: lesson ?? null,
    };
  }
}
