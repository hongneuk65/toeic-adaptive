import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { publicStimulus } from '../exam/public-stimulus';
import { learnerExplanation } from '../common/learner-explanation';
import { assertTutorHelpAccessible } from './tutor-access.policy';

export interface TutorSkill { id: number; code: string; name: string; }
export interface TutorContext {
  questionId: number; part: number; content: string; correctAnswer: string;
  options: Record<string, string>; selectedAnswer: string;
  answerOrigin: 'submitted_attempt' | 'practice_input'; attemptId?: number;
  skills: TutorSkill[]; passage: string; storedExplanation: string;
  warnings: string[];
}
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function text(value: unknown, depth = 0): string {
  if (depth > 32) return '';
  if (Array.isArray(value)) return value.map(item => text(item, depth + 1)).filter(Boolean).join('\n');
  const node = record(value);
  if (node.type === 'text') return typeof node.text === 'string' ? node.text : '';
  if (node.type === 'blank') return `[chỗ trống ${Number(node.number) || ''}]`;
  return text(node.children ?? node.blocks ?? node.documents ?? [], depth + 1);
}

@Injectable()
export class TutorContextService {
  constructor(private readonly prisma: PrismaService) {}
  async resolve(userId: number, params: { questionId: number; selectedAnswer: string; attemptId?: number }): Promise<TutorContext> {
    await assertTutorHelpAccessible(this.prisma, userId);
    let selectedAnswer = params.selectedAnswer;
    let source: Record<string, unknown>;
    let skills: TutorSkill[];
    if (params.attemptId) {
      const attempt = await this.prisma.examAttempt.findUnique({ where: { id: params.attemptId }, include: { answers: { where: { questionId: params.questionId } } } });
      if (!attempt) throw new NotFoundException('Không tìm thấy lượt làm bài.');
      if (attempt.userId !== userId) throw new ForbiddenException('Bạn không có quyền xem lượt làm bài này.');
      if (!attempt.submittedAt) throw new ForbiddenException('Nộp bài thi trước khi xem lời giải.');
      if (!attempt.questionIds.includes(params.questionId)) throw new BadRequestException('Câu hỏi không thuộc lượt làm bài.');
      if (!Array.isArray(attempt.questionSnapshot)) throw new BadRequestException('Lượt làm bài cũ thiếu bản chụp câu hỏi. Có thể xem giải thích ở chế độ luyện tập.');
      source = record(attempt.questionSnapshot.find(item => record(item).id === params.questionId));
      selectedAnswer = attempt.answers[0]?.selectedAnswer || 'CHƯA_CHỌN';
      const ids = Array.isArray(source.skills) ? source.skills.map(item => record(item).skillId).filter((id): id is number => Number.isInteger(id)) : [];
      skills = await this.prisma.skill.findMany({ where: { id: { in: ids } }, select: { id: true, code: true, name: true }, orderBy: { id: 'asc' } });
    } else {
      const question = await this.prisma.question.findUnique({ where: { id: params.questionId }, include: { skills: { include: { skill: true } } } });
      if (!question) throw new NotFoundException('Không tìm thấy câu hỏi.');
      source = question as unknown as Record<string, unknown>;
      skills = question.skills.map(item => ({ id: item.skill.id, code: item.skill.code, name: item.skill.name })).sort((a, b) => a.id - b.id);
    }
    if (!['A', 'B', 'C', 'D'].includes(String(source.correctAnswer)) || !Number.isInteger(source.part)) throw new BadRequestException('Câu hỏi thiếu dữ liệu đáp án hợp lệ.');
    const options = Object.fromEntries(['A', 'B', 'C', 'D'].map(key => [key, typeof source[`option${key}`] === 'string' ? source[`option${key}`] as string : '']).filter(([, value]) => value.trim()));
    if (selectedAnswer !== 'CHƯA_CHỌN' && !options[selectedAnswer]) throw new BadRequestException('Lựa chọn không tồn tại trong câu hỏi.');
    const structuredText = text(publicStimulus(source.stimulus));
    const passage = [typeof source.passage === 'string' ? source.passage : '', structuredText].filter(Boolean).join('\n\n').slice(0, 20000);
    const warnings: string[] = [];
    if (Number(source.part) <= 4 && !passage.trim()) warnings.push('Chưa có transcript; không suy diễn lời thoại từ audio hoặc tên file.');
    if (source.imageUrl || JSON.stringify(source.stimulus || {}).includes('"type":"image"')) warnings.push('Chưa phân tích hình ảnh; không khẳng định chi tiết thị giác chỉ từ văn bản.');
    if (passage.length >= 20000) warnings.push('Ngữ cảnh dài đã được giới hạn; có thể thiếu đoạn liên quan.');
    return { questionId: params.questionId, part: Number(source.part), content: String(source.content || ''), correctAnswer: String(source.correctAnswer),
      options, selectedAnswer, skills, passage, storedExplanation: learnerExplanation(typeof source.explanation === 'string' ? source.explanation : ''),
      answerOrigin: params.attemptId ? 'submitted_attempt' : 'practice_input', attemptId: params.attemptId, warnings };
  }
}
