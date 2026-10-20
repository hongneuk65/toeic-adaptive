import { Das3hService } from '../das3h/das3h.service';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { groupLearningTopics } from './learning-topics';

@Injectable()
export class MasteryService {
  private readonly logger = new Logger(MasteryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUserMasteryProfile(userId: number) {
    try {
      // 1. Lấy toàn bộ danh sách kỹ năng
      const allSkills = await this.prisma.skill.findMany({
        orderBy: [{ part: 'asc' }, { id: 'asc' }],
      });

      // 2. Lấy dữ liệu mastery của học viên
      const userMasteries = await this.prisma.userSkillMastery.findMany({
        where: { userId: Number(userId) },
      });

      const masteryMap = new Map(
        userMasteries.map((m) => [m.skillId, m]),
      );

      const das3h = new Das3hService(this.prisma);
      const [contributions, user, trainedScores] = await Promise.all([
        das3h.getSkillContributions(Number(userId), allSkills.map(skill => skill.id)),
        this.prisma.user.findUnique({ where: { id: Number(userId) }, select: { ability: true } }),
        das3h.getTrainedSkillScores(Number(userId), allSkills.map(skill => skill.id)),
      ]);

      // 3. Ghép nối dữ liệu kỹ năng
      const skillsProfile = allSkills.map((skill) => {
        const userRecord = masteryMap.get(skill.id);
        return {
          skillId: skill.id,
          skillCode: skill.code,
          skillName: skill.name,
          category: skill.category,
          part: skill.part ?? 1,
          masteryScore: trainedScores.get(skill.id) ?? das3h.sigmoid((user?.ability ?? 0) + (contributions.get(skill.id) ?? 0)),
          scoreSource: trainedScores.has(skill.id) ? 'trained-own-question-average' : 'legacy-heuristic',
          evidenceStatus: userRecord?.practiceCount ? 'practiced' : 'unassessed',
          practiceCount: userRecord?.practiceCount ?? 0,
          lastPracticed: userRecord?.lastPracticed ?? null,
        };
      });

      // 4. Tổng hợp điểm trung bình theo 7 Parts
      const partStats: Record<number, { totalScore: number; count: number }> = {};
      for (let p = 1; p <= 7; p++) {
        partStats[p] = { totalScore: 0, count: 0 };
      }

      for (const item of skillsProfile) {
        const partNum = Number(item.part);
        if (!partStats[partNum]) {
          partStats[partNum] = { totalScore: 0, count: 0 };
        }
        partStats[partNum].totalScore += item.masteryScore;
        partStats[partNum].count += 1;
      }

      const partBreakdown = Object.entries(partStats).map(([partStr, stat]) => ({
        part: Number(partStr),
        partName: `Part ${partStr}`,
        averageMastery: stat.count > 0 ? Number((stat.totalScore / stat.count).toFixed(3)) : 0.5,
        totalSkills: stat.count,
      }));

      const overallMastery = skillsProfile.length > 0
        ? Number(
            (
              skillsProfile.reduce((acc, curr) => acc + curr.masteryScore, 0) /
              skillsProfile.length
            ).toFixed(3),
          )
        : 0.5;

      const lessons = await this.prisma.theoryLesson.findMany({
        select: { id: true, title: true, part: true, skillId: true, skill: { select: { code: true } } },
        orderBy: { id: 'asc' },
      });

      return {
        userId,
        model: das3h.getModelStatus(),
        skills: skillsProfile,
        partBreakdown,
        overallMastery,
        topicGroups: groupLearningTopics(skillsProfile, lessons),
      };
    } catch (error: any) {
      // In chi tiết lỗi thật ra Terminal Backend
      this.logger.error('❌ Lỗi tại getUserMasteryProfile():', error);
      throw new InternalServerErrorException(error.message || 'Lỗi xử lý dữ liệu Mastery');
    }
  }
}
