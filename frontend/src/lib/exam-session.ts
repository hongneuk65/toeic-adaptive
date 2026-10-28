import type { ExamSession } from '../types/exam';

const DURATION_MINUTES = { FULL: 120, MINI: 60, PART_5: 20 };

export function remainingSeconds(exam: ExamSession, now = Date.now()) {
  const customParts = exam.selectedParts ?? [...new Set((exam.questions ?? []).map(question => question.part))];
  const readingMinutes = customParts.reduce((sum, part) => sum + ([0,0,0,0,0,20,10,45][part] || 0), 0);
  const listeningSeconds = exam.listeningPlan?.targetSeconds ?? Math.round((exam.questions ?? []).filter(question => question.part <= 4).length * 27);
  const duration = exam.examType === 'CUSTOM' ? listeningSeconds + readingMinutes * 60
    : exam.listeningPlan && (exam.examType === 'FULL' || exam.examType === 'MINI') ? listeningSeconds + (exam.examType === 'FULL' ? 75 * 60 : 37.5 * 60) : DURATION_MINUTES[exam.examType] * 60;
  const deadline = exam.deadlineAt ? Date.parse(exam.deadlineAt) : Date.parse(exam.startedAt) + duration * 1000;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function readAnswers(attemptId: number, questionIds?: readonly number[]): Record<number, string> {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(`exam_answers_${attemptId}`) || '{}');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const allowed = questionIds ? new Set(questionIds) : undefined;
    return Object.fromEntries(Object.entries(value).filter(([id, answer]) =>
      /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id)) &&
      (!allowed || allowed.has(Number(id))) && typeof answer === 'string' && /^[ABCD]$/.test(answer)));
  } catch {
    return {};
  }
}

export function readDraftRevision(attemptId: number): number | null {
  try {
    const raw = sessionStorage.getItem(`exam_draft_revision_${attemptId}`);
    if (raw === null) return null;
    const revision = Number(raw);
    return Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
  } catch { return null; }
}

export function saveAnswers(attemptId: number, answers: Record<number, string>, revision?: number): boolean {
  try {
    sessionStorage.setItem(`exam_answers_${attemptId}`, JSON.stringify(answers));
    if (revision !== undefined) sessionStorage.setItem(`exam_draft_revision_${attemptId}`, String(revision));
    return true;
  } catch {
    return false;
  }
}

export function clearExamStorage(attemptId: number): void {
  for (const key of [`exam_${attemptId}`, `exam_answers_${attemptId}`, `exam_draft_revision_${attemptId}`]) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Browser storage cleanup must not turn a committed submission into a failure.
    }
  }
}
