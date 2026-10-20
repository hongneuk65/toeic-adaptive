/** Only same-app learning paths are accepted; never navigate to external URLs. */
export function learningReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !/^\/(?:dashboard|recommendations|reading|listening|flashcards|theory|exam|history)(?:[/?#]|$)/.test(value) || value.includes('\\') || [...value].some(character => character.charCodeAt(0) < 32)) return '/dashboard';
  return value;
}
