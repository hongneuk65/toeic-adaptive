import { BadRequestException } from '@nestjs/common';

interface TimedQuestion { id: number; part: number; audioUrl?: string | null; stimulus?: unknown }
export interface ListeningPlan {
  targetSeconds: number; audioSeconds: number; restSeconds: number;
  groups: { firstQuestionId: number; audioSeconds: number; restSeconds: number; questionCount: number }[];
}

export function buildListeningPlan(examType: string, questions: readonly TimedQuestion[]): ListeningPlan | undefined {
  const listening = questions.filter(q => q.part <= 4);
  if (!listening.length) return undefined;
  const groups: { firstQuestionId: number; audioMs: number; questionCount: number; key: string }[] = [];
  for (const q of listening) {
    const data = q.stimulus;
    const duration = data && typeof data === 'object' && 'audioDurationSeconds' in data ? data.audioDurationSeconds : undefined;
    // Legacy attempts without measured media retain the UI's basic rest, never a guessed 45-minute claim.
    if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return undefined;
    const previous = groups.at(-1);
    const key = `${q.part}:${q.audioUrl}`;
    if ((q.part === 3 || q.part === 4) && previous?.key === key) previous.questionCount++;
    else groups.push({ firstQuestionId: q.id, audioMs: Math.round(duration * 1000), questionCount: 1, key });
  }
  const audioMs = groups.reduce((sum, group) => sum + group.audioMs, 0);
  const proportionalMs = Math.round(2700000 * listening.length / 100);
  const targetMs = examType === 'FULL' ? 2700000 : examType === 'CUSTOM' ? Math.max(proportionalMs, audioMs + 5000 * listening.length) : proportionalMs;
  const restMs = targetMs - audioMs;
  if (restMs < 0) throw new BadRequestException('Tổng audio vượt thời lượng phần nghe. Vui lòng tạo đề khác.');
  // Allocate integer milliseconds by cumulative question weight; rounding never changes the total budget.
  let processed = 0, allocated = 0;
  const scheduled = groups.map(group => {
    processed += group.questionCount;
    const cumulative = Math.round(restMs * processed / listening.length);
    const gap = cumulative - allocated;
    allocated = cumulative;
    return { firstQuestionId: group.firstQuestionId, audioSeconds: group.audioMs / 1000,
      restSeconds: gap / 1000, questionCount: group.questionCount };
  });
  return { targetSeconds: targetMs / 1000, audioSeconds: audioMs / 1000, restSeconds: restMs / 1000, groups: scheduled };
}
