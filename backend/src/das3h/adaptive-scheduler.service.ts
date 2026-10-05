import { Injectable, NotFoundException } from '@nestjs/common';
import { questionSelect } from '../common/question-select';
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

    // 2. Lấy 50 câu ứng viên chưa làm kèm itemDifficulty
    let pool = await this.prisma.question.findMany({
      where: {
        id: { notIn: excludedIds },
        skills: { some: { skillId: Number(skillId) } },
      },
      select: { ...questionSelect, itemDifficulty: true },
      take: this.CANDIDATE_LIMIT,
    });

    // Nếu hết câu chưa làm, lấy lại trong toàn bộ câu của kỹ năng đó
    if (pool.length === 0) {
      pool = await this.prisma.question.findMany({
        where: {
          skills: { some: { skillId: Number(skillId) } },
        },
        select: { ...questionSelect, itemDifficulty: true },
        take: this.CANDIDATE_LIMIT,
      });
    }

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

    const evaluated = pool.map((q) => {
      const prob = probMap.get(q.id) ?? this.TARGET_PROB;
      const distance = Math.abs(prob - this.TARGET_PROB);
      const { itemDifficulty: _itemDifficulty, ...sanitizedQuestion } = q;
      return {
        question: sanitizedQuestion,
        predictedProbability: prob,
        distanceToTarget: distance,
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
    };
  }
}

