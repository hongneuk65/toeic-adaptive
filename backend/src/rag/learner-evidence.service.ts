import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Das3hService } from '../das3h/das3h.service';
import { TutorSkill } from './tutor-context.service';

export interface SkillEvidence extends TutorSkill {
  predictedSuccess: number | null; attempts: number; distinctQuestions: number;
  recentAttempts: number; lastPracticed: string | null;
  status: 'insufficient' | 'stale' | 'sufficient';
}
export const EVIDENCE_POLICY = { version: 'tutor-evidence-v1', lookbackDays: 30, recentDays: 14, minAttempts: 8, minDistinctQuestions: 5, minRecentAttempts: 5, maxRows: 2000 } as const;

@Injectable()
export class LearnerEvidenceService {
  constructor(private readonly prisma: PrismaService, private readonly das3h: Das3hService) {}
  async get(userId: number, skills: TutorSkill[], now = new Date()): Promise<SkillEvidence[]> {
    if (!skills.length) return [];
    const ids = skills.map(skill => skill.id);
    const since = new Date(now.getTime() - EVIDENCE_POLICY.lookbackDays * 86400000);
    const [history, predictions] = await Promise.all([
      this.prisma.studentSkillHistory.findMany({ where: { userId, skillId: { in: ids }, createdAt: { gte: since, lte: now } },
        select: { skillId: true, questionId: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: EVIDENCE_POLICY.maxRows }),
      this.das3h.getTrainedSkillScores(userId, ids, now),
    ]);
    return skills.map(skill => {
      const rows = history.filter(row => row.skillId === skill.id);
      const distinctQuestions = new Set(rows.map(row => row.questionId)).size;
      const recentAttempts = rows.filter(row => now.getTime() - row.createdAt.getTime() <= EVIDENCE_POLICY.recentDays * 86400000).length;
      const score = predictions.get(skill.id);
      const predictedSuccess = score !== undefined && Number.isFinite(score) && score >= 0 && score <= 1 ? score : null;
      const enough = history.length < EVIDENCE_POLICY.maxRows && rows.length >= EVIDENCE_POLICY.minAttempts && distinctQuestions >= EVIDENCE_POLICY.minDistinctQuestions;
      return { ...skill, predictedSuccess, attempts: rows.length, distinctQuestions, recentAttempts, lastPracticed: rows[0]?.createdAt.toISOString() ?? null,
        status: !enough || predictedSuccess === null ? 'insufficient' : recentAttempts < EVIDENCE_POLICY.minRecentAttempts ? 'stale' : 'sufficient' };
    });
  }
}
