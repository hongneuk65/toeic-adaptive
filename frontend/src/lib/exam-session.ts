import type { ExamSession } from '../types/exam';

const DURATION_MINUTES = { FULL: 120, MINI: 60, PART_5: 20 };

export function remainingSeconds(exam: ExamSession, now = Date.now()) {
  const deadline = Date.parse(exam.startedAt) + DURATION_MINUTES[exam.examType] * 60000;
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

export function saveAnswers(attemptId: number, answers: Record<number, string>): boolean {
  try {
    sessionStorage.setItem(`exam_answers_${attemptId}`, JSON.stringify(answers));
    return true;
  } catch {
    return false;
  }
}

export function clearExamStorage(attemptId: number): void {
  for (const key of [`exam_${attemptId}`, `exam_answers_${attemptId}`]) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Browser storage cleanup must not turn a committed submission into a failure.
    }
  }
}