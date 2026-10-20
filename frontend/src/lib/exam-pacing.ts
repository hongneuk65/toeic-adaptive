export function restSecondsRemaining(deadlineMs: number, nowMs = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineMs - nowMs) / 1000));
}
export function listeningRestSeconds(plannedSeconds: number | undefined, questionCount: number): number {
  return plannedSeconds !== undefined && Number.isFinite(plannedSeconds) && plannedSeconds >= 0 ? plannedSeconds : Math.max(1, questionCount) * 5;
}
export function restDeadline(existingDeadlineMs: number | undefined, restSeconds: number, nowMs = Date.now()): number {
  return existingDeadlineMs && Number.isFinite(existingDeadlineMs) && existingDeadlineMs > 0 ? existingDeadlineMs : nowMs + Math.max(0, restSeconds) * 1000;
}
