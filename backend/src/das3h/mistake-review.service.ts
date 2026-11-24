import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from './das3h.service';
import { importedQuestions } from '../common/imported-questions';
import { questionSelect } from '../common/question-select';
import { assertQuestionAnswersAccessible, openExamQuestionIds } from '../common/exam-answer-access';
import { MISTAKE_REVIEW_LIMITS, MistakeReviewPlan, candidateQuestionIds, planMistakeReview } from './mistake-review.policy';

const HISTORY_DAYS = 180;
const HISTORY_ROWS = 5000;

@Injectable()
export class MistakeReviewService {
  constructor(private readonly prisma: PrismaService, private readonly das3h: Das3hService) {}

  /** Một vài kỹ năng yếu kèm các câu hay sai nhất; không trả đáp án. */
  async forUser(userId: number, now = new Date()): Promise<MistakeReviewPlan & { version: string }> {
    const rows = await this.prisma.studentSkillHistory.findMany({
      where: { userId, createdAt: { gte: new Date(now.getTime() - HISTORY_DAYS * 86400000), lte: now } },
      select: { questionId: true, skillId: true, isCorrect: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_ROWS,
    });
    const empty = { version: 'mistake-review-v1', skills: [], openMistakes: 0, dueMistakes: 0, hiddenDueMistakes: 0 };
    const wrongIds = [...new Set(rows.filter(r => !r.isCorrect).map(r => r.questionId))];
    if (!wrongIds.length) return empty;
    const skillIds = [...new Set(rows.map(r => r.skillId))];
    const [published, liveExam, masteries, skills] = await Promise.all([
      this.prisma.question.findMany({ where: { id: { in: wrongIds }, ...importedQuestions }, select: { id: true, itemDifficulty: true } }),
      openExamQuestionIds(this.prisma, userId, now),
      this.prisma.userSkillMastery.findMany({ where: { userId, skillId: { in: skillIds } }, select: { skillId: true, masteryScore: true } }),
      this.prisma.skill.findMany({ where: { id: { in: skillIds } }, select: { id: true, name: true, part: true } }),
    ]);
    const difficulty = new Map(published.map(q => [q.id, q.itemDifficulty]));
    const excluded = new Set(wrongIds.filter(id => !difficulty.has(id) || liveExam.has(id)));
    const mastery = new Map(masteries.map(m => [m.skillId, m.masteryScore]));
    const info = skills.map(s => ({ skillId: s.id, skillName: s.name, part: s.part, masteryScore: mastery.get(s.id) ?? null }));

    // Lượt 1 lấy rộng ứng viên, lượt 2 xếp lại theo xác suất DAS3H dự đoán.
    const wide = planMistakeReview(rows, info, now, new Map(), excluded, { ...MISTAKE_REVIEW_LIMITS, questionsPerSkill: MISTAKE_REVIEW_LIMITS.candidatesPerSkill });
    if (!wide.skills.length) return { version: 'mistake-review-v1', ...wide };
    const predictions = new Map<number, number>();
    for (const skill of wide.skills) {
      const candidates = skill.questions.map(q => ({ id: q.questionId, itemDifficulty: difficulty.get(q.questionId)! }));
      for (const result of await this.das3h.evaluateCandidatesForSkill(userId, skill.skillId, candidates)) {
        predictions.set(result.questionId, result.predictedProbability);
      }
    }
    if (candidateQuestionIds(wide).some(id => !predictions.has(id))) predictions.clear();
    return { version: 'mistake-review-v1', ...planMistakeReview(rows, info, now, predictions, excluded) };
  }

  /** Mở lại đúng một câu người học từng làm sai; đáp án chỉ trả sau khi chấm. */
  async reviewQuestion(userId: number, questionId: number, skillId: number) {
    if (!Number.isSafeInteger(questionId) || questionId <= 0 || !Number.isSafeInteger(skillId) || skillId <= 0) {
      throw new BadRequestException('Câu hỏi hoặc kỹ năng không hợp lệ.');
    }
    const mistake = await this.prisma.studentSkillHistory.findFirst({ where: { userId, questionId, isCorrect: false }, select: { id: true } });
    if (!mistake) throw new NotFoundException('Câu này không có trong danh sách ôn của bạn.');
    await assertQuestionAnswersAccessible(this.prisma, userId, [questionId]);
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, ...importedQuestions },
      select: { ...questionSelect, itemDifficulty: true, skills: { select: { skillId: true } } },
    });
    if (!question) throw new NotFoundException('Câu hỏi không còn trong ngân hàng luyện tập.');
    if (!question.skills.some(s => s.skillId === skillId)) throw new BadRequestException('Câu hỏi không thuộc kỹ năng đã chọn');
    const [prediction] = await this.das3h.evaluateCandidatesForSkill(userId, skillId, [{ id: question.id, itemDifficulty: question.itemDifficulty }]);
    const { itemDifficulty: _difficulty, skills: _skills, ...selectedQuestion } = question;
    return {
      selectedQuestion,
      predictedProb: prediction?.predictedProbability ?? null,
      targetProb: null,
      evaluatedCandidatesCount: 1,
      isExploration: false,
      predictionSource: prediction?.predictionSource ?? null,
      modelVersion: prediction?.modelVersion ?? null,
      selectionReason: 'Ôn lại câu bạn từng làm sai.',
      reusingRecentQuestions: false,
      reviewMode: true,
    };
  }
}
