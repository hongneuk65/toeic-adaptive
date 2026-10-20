/** Failure returns soon; successful recall extends spacing up to thirty days. */
export function nextReview(known: boolean, previousDays: number, now = new Date()) {
  const intervals = [1, 3, 7, 14, 30];
  const intervalDays = known ? intervals.find(days => days > previousDays) ?? 30 : 0;
  return { intervalDays, dueAt: new Date(now.getTime() + (known ? intervalDays * 86400000 : 600000)) };
}
