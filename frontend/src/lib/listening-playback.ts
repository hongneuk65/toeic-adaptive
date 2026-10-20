export function playbackStart(start: number, exact = false) {
  return exact ? start : Math.max(0, start - .75);
}
export function seekReady(position: number, target: number, elapsed: number) {
  return elapsed >= 100 && position <= target + .35 && position >= Math.max(0, target - 2.5);
}
