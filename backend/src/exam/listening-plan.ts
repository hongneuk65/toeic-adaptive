import { BadRequestException } from '@nestjs/common';

interface TimedQuestion { id: number; part: number; audioUrl?: string | null; content?: string; stimulus?: unknown }
export interface ListeningPlan {
  targetSeconds: number; audioSeconds: number; restSeconds: number;
  pacingVersion: 'part-response-v1';
  groups: { firstQuestionId: number; audioSeconds: number; restSeconds: number; questionCount: number }[];
}

// ETS sample: P1/2 5s; P3/4 normally 8s after each narrated question.
// Longer sample pauses require reviewed per-question timing, not a guess
// from the presence of a graphic. Conversation-only clips use grouped windows;
// they cannot reproduce a complete narrated 45-minute ETS track.
// https://www.fr.ets.org/content/dam/ets-org/fr/pdfs/toeic/sample-test-listening-reading.pdf
function responseSeconds(q: TimedQuestion): number {
  if (q.part <= 2) return 5;
  const stimulus = q.stimulus as Record<string, unknown> | null;
  return stimulus?.audioQuestionResponseSeconds === 12 ? 12 : 8;
}

export function buildListeningPlan(_examType: string, questions: readonly TimedQuestion[]): ListeningPlan | undefined {
  const listening = questions.filter(q => q.part >= 1 && q.part <= 4);
  if (!listening.length) return undefined;
  const groups: { firstQuestionId: number; audioMs: number; responseMs: number; tailMs: number; questionCount: number; key: string }[] = [];
  for (const q of listening) {
    const data = q.stimulus as Record<string, unknown> | null;
    const duration = data && typeof data === 'object' && 'audioDurationSeconds' in data ? data.audioDurationSeconds : undefined;
    // Legacy attempts without measured media retain the UI's basic rest, never a guessed 45-minute claim.
    if (!q.audioUrl || typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) return undefined;
    const audioMs = Math.round(duration * 1000);
    const tail = data?.audioTrailingSilenceSeconds;
    const tailMs = typeof tail === 'number' && Number.isFinite(tail) && tail >= 0 && tail < duration ? Math.floor(tail * 1000) : 0;
    const previous = groups.at(-1);
    const groupId = typeof data?.groupId === 'string' ? data.groupId : '';
    const key = `${q.part}:${groupId}:${q.audioUrl}`;
    if ((q.part === 3 || q.part === 4) && previous?.key === key) {
      if (previous.audioMs !== audioMs || previous.tailMs !== tailMs) throw new BadRequestException('Metadata audio trong nhóm câu hỏi không đồng nhất.');
      previous.questionCount++;
      previous.responseMs += responseSeconds(q) * 1000;
    } else groups.push({ firstQuestionId: q.id, audioMs, responseMs: responseSeconds(q) * 1000, tailMs, questionCount: 1, key });
  }
  const scheduled = groups.map(group => ({ firstQuestionId: group.firstQuestionId, audioSeconds: group.audioMs / 1000,
    restSeconds: Math.max(0, group.responseMs - group.tailMs) / 1000, questionCount: group.questionCount }));
  const audioSeconds = scheduled.reduce((sum, g) => sum + Math.round(g.audioSeconds * 1000), 0) / 1000;
  const restSeconds = scheduled.reduce((sum, g) => sum + Math.round(g.restSeconds * 1000), 0) / 1000;
  return { pacingVersion: 'part-response-v1', targetSeconds: Math.round((audioSeconds + restSeconds) * 1000) / 1000, audioSeconds, restSeconds, groups: scheduled };
}
