export interface ListeningCursor { maxGroupIndex: number; readingUnlocked: boolean }
export interface ListeningProgress { position: number; completed: boolean; audioEnded?: boolean; restDeadlineMs?: number }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const memory = new Map<string, string>();
function storage(): StorageLike | undefined {
  try { return typeof sessionStorage === 'undefined' ? undefined : sessionStorage; } catch { return undefined; }
}
function read(key: string, target = storage()): Record<string, unknown> {
  let raw = memory.get(key) ?? '{}';
  try { raw = memory.get(key) ?? target?.getItem(key) ?? raw; } catch { /* Use the current page checkpoint. */ }
  try {
    const value: unknown = JSON.parse(raw);
    return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {};
  } catch { return {}; }
}
function write(key: string, value: unknown, target = storage()) {
  const json = JSON.stringify(value);
  memory.set(key, json);
  try { target?.setItem(key, json); } catch { /* Keep the current page protected when storage is unavailable. */ }
}
function nonnegative(value: unknown) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0; }
export function readListeningCursor(attemptId: number, target?: StorageLike): ListeningCursor {
  const value = read(`exam-listening:${attemptId}:cursor`, target);
  return { maxGroupIndex: Math.floor(nonnegative(value.maxGroupIndex)), readingUnlocked: value.readingUnlocked === true };
}
export function saveListeningCursor(attemptId: number, value: ListeningCursor, target?: StorageLike): ListeningCursor {
  const previous = readListeningCursor(attemptId, target);
  const next = { maxGroupIndex: Math.max(previous.maxGroupIndex, Math.floor(nonnegative(value.maxGroupIndex))), readingUnlocked: previous.readingUnlocked || value.readingUnlocked };
  write(`exam-listening:${attemptId}:cursor`, next, target);
  return next;
}
export function readListeningProgress(attemptId: number, groupKey: string, target?: StorageLike): ListeningProgress {
  const value = read(`exam-listening:${attemptId}:audio:${groupKey}`, target);
  return { position: nonnegative(value.position), completed: value.completed === true, ...(value.audioEnded === true ? { audioEnded: true } : {}), ...(nonnegative(value.restDeadlineMs) > 0 ? { restDeadlineMs: nonnegative(value.restDeadlineMs) } : {}) };
}
export function saveListeningProgress(attemptId: number, groupKey: string, value: ListeningProgress, target?: StorageLike): ListeningProgress {
  const previous = readListeningProgress(attemptId, groupKey, target);
  const next: ListeningProgress = { position: Math.max(previous.position, nonnegative(value.position)), completed: previous.completed || value.completed };
  if (previous.audioEnded || value.audioEnded) next.audioEnded = true;
  const deadline = previous.restDeadlineMs ?? value.restDeadlineMs;
  if (deadline && Number.isFinite(deadline) && deadline > 0) next.restDeadlineMs = deadline;
  write(`exam-listening:${attemptId}:audio:${groupKey}`, next, target);
  return next;
}
