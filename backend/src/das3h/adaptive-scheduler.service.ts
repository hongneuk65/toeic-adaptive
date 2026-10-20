import { Injectable, NotFoundException } from '@nestjs/common';
import { questionSelect } from '../common/question-select';
import { importedQuestions } from '../common/imported-questions';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from './das3h.service';

@Injectable()
export class AdaptiveSchedulerService {
  // Vùng mục tiêu thử thách tối ưu ZPD: 70% - 80% (tâm là 0.75)
  private readonly TARGET_PROB = 0.75;
  private readonly CANDIDATE_LIMIT = 50;
  private readonly EPSILON = 0.15; // 15% xác suất exploration cho câu hỏi mới/chưa hiệu chuẩn

  constructor(
    private readonly prisma: PrismaService,
    private readonly das3hService: Das3hService,
  ) {}

  /**
   * Chọn câu hỏi tối ưu nhất cho học sinh theo kỹ năng
   */
  async getNextAdaptiveQuestion(userId: number, skillId: number) {
    // 1. Lấy danh sách câu hỏi đã làm gần đây (tránh lặp lại liên tục)
    const recentHistories = await this.prisma.studentSkillHistory.findMany({
      where: { userId: Number(userId), skillId: Number(skillId) },
      select: { questionId: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const excludedIds = recentHistories.map((h) => h.questionId);

    // Sample evenly across difficulty strata, with a random offset in every stratum.
    // Fetch only lightweight metadata across the bank before loading selected stimuli.
    let eligible = await this.prisma.question.findMany({
      where: { ...importedQuestions, id: { notIn: excludedIds }, skills: { some: { skillId: Number(skillId) } } },
      select: { id: true, itemDifficulty: true },
      orderBy: [{ itemDifficulty: 'asc' }, { id: 'asc' }],
    });
    if (!eligible.length) eligible = await this.prisma.question.findMany({
      where: { ...importedQuestions, skills: { some: { skillId: Number(skillId) } } },
      select: { id: true, itemDifficulty: true },
      orderBy: [{ itemDifficulty: 'asc' }, { id: 'asc' }],
    });
    const count = Math.min(this.CANDIDATE_LIMIT, eligible.length);
    const sampledIds = Array.from({ length: count }, (_, i) => {
      const start = Math.floor(i * eligible.length / count);
      const end = Math.floor((i + 1) * eligible.length / count);
      return eligible[start + Math.floor(Math.random() * (end - start))].id;
    });
    const pool = await this.prisma.question.findMany({
      where: { id: { in: sampledIds } }, select: { ...questionSelect, itemDifficulty: true },
    });

    if (pool.length === 0) {
      throw new NotFoundException('Chưa có câu hỏi nào trong kho cho kỹ năng này.');
    }

    // 3. Tính toán xác suất thành công hàng loạt (Khử triệt để N+1 Queries)
    const evaluatedResults = await this.das3hService.evaluateCandidatesForSkill(
      Number(userId),
      Number(skillId),
      pool.map((q) => ({ id: q.id, itemDifficulty: q.itemDifficulty })),
    );

    const probMap = new Map(
      evaluatedResults.map((r) => [r.questionId, r.predictedProbability]),
    );
    const sources = new Map(evaluatedResults.map(r => [r.questionId, r]));

    const evaluated = pool.map((q) => {
      const prob = probMap.get(q.id) ?? this.TARGET_PROB;
      const distance = Math.abs(prob - this.TARGET_PROB);
      const { itemDifficulty: _itemDifficulty, ...sanitizedQuestion } = q;
      return {
        question: sanitizedQuestion,
        predictedProbability: prob,
        distanceToTarget: distance,
        predictionSource: sources.get(q.id)?.predictionSource ?? 'legacy-heuristic',
        modelVersion: sources.get(q.id)?.modelVersion ?? null,
      };
    });

    // 4. Sắp xếp tìm câu có khoảng cách gần 0.75 nhất (ZPD Exploit)
    evaluated.sort((a, b) => a.distanceToTarget - b.distanceToTarget);

    // 5. Epsilon-greedy exploration: 15% cơ hội chọn câu ngẫu nhiên trong pool để hiệu chuẩn
    const isExploration = Math.random() < this.EPSILON && evaluated.length > 1;
    const selected = isExploration
      ? evaluated[Math.floor(Math.random() * evaluated.length)]
      : evaluated[0];

    return {
      selectedQuestion: selected.question,
      predictedProb: selected.predictedProbability,
      targetProb: this.TARGET_PROB,
      evaluatedCandidatesCount: pool.length,
      isExploration,
      predictionSource: selected.predictionSource,
      modelVersion: selected.modelVersion,
    };
  }
}

