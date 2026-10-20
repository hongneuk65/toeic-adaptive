import { Das3hService } from '../das3h/das3h.service';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RoadmapStep {
  skillId: number;
  skillCode: string;
  skillName: string;
  part: number;
  category: string;
  masteryScore: number;
  evidenceStatus: 'practiced' | 'unassessed';
  priority: 'P0_CRITICAL' | 'P1_FOCUS' | 'P2_ADVANCED';
  priorityLabel: string;
  recommendedLesson: {
    id: number;
    title: string;
    part: number;
  } | null;
  practiceCount: number;
  actionText: string;
  estimatedPointGain: number;
}

export interface PersonalizedRoadmapResult {
  summary: {
    totalSkillsTracked: number;
    criticalCount: number;
    focusCount: number;
    masteredCount: number;
    averageMastery: number;
    estimatedPotentialIncrease: number;
    weakestPart: number;
  };
  prioritySteps: RoadmapStep[];
}

@Injectable()
export class RagRoadmapService {
  private readonly logger = new Logger(RagRoadmapService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sinh Lộ trình Ưu tiên Cá nhân hóa dựa trên DAS3H và Kho Tri thức
   */
  async getPersonalizedRoadmap(userId: number): Promise<PersonalizedRoadmapResult> {
    // 1. Lấy tất cả Skills và UserSkillMastery của học viên
    const [allSkills, userMasteries, allLessons] = await Promise.all([
      this.prisma.skill.findMany({
        orderBy: [{ part: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.userSkillMastery.findMany({
        where: { userId },
      }),
      this.prisma.theoryLesson.findMany({
        select: { id: true, title: true, part: true, skillId: true },
      }),
    ]);

    const das3h = new Das3hService(this.prisma);
    const [contributions, user, trainedScores] = await Promise.all([
      das3h.getSkillContributions(userId, allSkills.map(skill => skill.id)),
      this.prisma.user.findUnique({ where: { id: userId }, select: { ability: true } }),
      das3h.getTrainedSkillScores(userId, allSkills.map(skill => skill.id)),
    ]);

    const masteryMap = new Map<number, { score: number; count: number }>();
    userMasteries.forEach((m) => {
      masteryMap.set(m.skillId, { score: m.masteryScore, count: m.practiceCount });
    });

    const lessonMap = new Map<number, { id: number; title: string; part: number }>();
    allLessons.forEach((l) => {
      lessonMap.set(l.skillId, { id: l.id, title: l.title, part: l.part });
    });

    const steps: RoadmapStep[] = [];
    let criticalCount = 0;
    let focusCount = 0;
    let masteredCount = 0;
    let totalScore = 0;

    const partScores: Record<number, { total: number; count: number }> = {};

    for (const skill of allSkills) {
      const info = masteryMap.get(skill.id) || { score: 0.5, count: 0 };
      const score = trainedScores.get(skill.id) ?? das3h.sigmoid((user?.ability ?? 0) + (contributions.get(skill.id) ?? 0));
      totalScore += score;

      if (!partScores[skill.part]) {
        partScores[skill.part] = { total: 0, count: 0 };
      }
      partScores[skill.part].total += score;
      partScores[skill.part].count += 1;

      let priority: 'P0_CRITICAL' | 'P1_FOCUS' | 'P2_ADVANCED';
      let priorityLabel: string;
      let actionText: string;
      let estimatedPointGain: number;

      if (!info.count) {
        priority = 'P1_FOCUS';
        priorityLabel = 'Chưa đủ dữ liệu đánh giá';
        actionText = 'Làm một lượt luyện tập để xác định mức độ hiện tại của kỹ năng';
        estimatedPointGain = 0;
        focusCount++;
      } else if (score < 0.45) {
        priority = 'P0_CRITICAL';
        priorityLabel = 'Nên củng cố';
        actionText = 'Ôn bài học liên quan rồi luyện một lượt ngắn';
        estimatedPointGain = 0;
        criticalCount++;
      } else if (score < 0.65) {
        priority = 'P1_FOCUS';
        priorityLabel = 'Nên luyện tiếp';
        actionText = 'Luyện câu mới để củng cố kiến thức và kiểm tra lại kết quả';
        estimatedPointGain = 0;
        focusCount++;
      } else {
        priority = 'P2_ADVANCED';
        priorityLabel = 'P2 - Nâng cao & Duy trì';
        actionText = 'Luyện có giới hạn thời gian theo từng Part khi đã sẵn sàng';
        estimatedPointGain = 0;
        masteredCount++;
      }

      steps.push({
        skillId: skill.id,
        skillCode: skill.code,
        skillName: skill.name,
        part: skill.part,
        category: skill.category,
        masteryScore: score,
        evidenceStatus: info.count ? 'practiced' : 'unassessed',
        priority,
        priorityLabel,
        recommendedLesson: lessonMap.get(skill.id) || null,
        practiceCount: info.count,
        actionText,
        estimatedPointGain,
      });
    }

    // Sắp xếp các bước ưu tiên: P0 trước -> P1 tiếp theo -> P2 cuối cùng
    // Trong cùng mức ưu tiên, sắp xếp theo masteryScore tăng dần (yếu nhất làm trước)
    steps.sort((a, b) => {
      const priorityOrder = { P0_CRITICAL: 0, P1_FOCUS: 1, P2_ADVANCED: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.masteryScore - b.masteryScore;
    });

    // Tìm Part yếu nhất
    let weakestPart = 5;
    let lowestPartAvg = 1.0;
    for (const [pStr, val] of Object.entries(partScores)) {
      const p = parseInt(pStr, 10);
      const avg = val.total / val.count;
      if (avg < lowestPartAvg) {
        lowestPartAvg = avg;
        weakestPart = p;
      }
    }

    const totalSkills = allSkills.length;
    const averageMastery = totalSkills > 0 ? totalScore / totalSkills : 0.5;
    // Prediction probabilities are not validated TOEIC point gains.
    const estimatedPotentialIncrease = 0;

    return {
      summary: {
        totalSkillsTracked: totalSkills,
        criticalCount,
        focusCount,
        masteredCount,
        averageMastery,
        estimatedPotentialIncrease,
        weakestPart,
      },
      prioritySteps: steps,
    };
  }
}
