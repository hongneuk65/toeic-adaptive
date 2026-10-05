import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RoadmapStep {
  skillId: number;
  skillCode: string;
  skillName: string;
  part: number;
  category: string;
  masteryScore: number;
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
      const score = info.score;
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

      if (score < 0.45) {
        priority = 'P0_CRITICAL';
        priorityLabel = 'P0 - Báo động đỏ (Cấp bách)';
        actionText = 'Ôn gấp lý thuyết gốc và làm mini-quiz thích ứng ZPD để bù lỗ hổng';
        estimatedPointGain = 25;
        criticalCount++;
      } else if (score < 0.65) {
        priority = 'P1_FOCUS';
        priorityLabel = 'P1 - Trọng tâm bứt phá (ZPD)';
        actionText = 'Luyện tập thích ứng để tăng xác suất thành thạo lên trên 70%';
        estimatedPointGain = 15;
        focusCount++;
      } else {
        priority = 'P2_ADVANCED';
        priorityLabel = 'P2 - Nâng cao & Duy trì';
        actionText = 'Luyện các bẫy khó và tối ưu tốc độ làm bài dưới 15 giây/câu';
        estimatedPointGain = 5;
        masteredCount++;
      }

      steps.push({
        skillId: skill.id,
        skillCode: skill.code,
        skillName: skill.name,
        part: skill.part,
        category: skill.category,
        masteryScore: score,
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
    const estimatedPotentialIncrease = Math.min(250, criticalCount * 25 + focusCount * 15);

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
