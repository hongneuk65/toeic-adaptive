export function vocabularyRouteAllowed(path: string): boolean {
  return /^\/(reading|listening|theory|flashcards|recommendations|dashboard)(\/|$)/.test(path) || /^\/exam\/\d+\/review\/?$/.test(path);
}

export function selectedVocabularyText(text: string): string | null {
  const word = text.replace(/\s+/g, ' ').trim().replace(/^[\s.,;:!?"“”‘’()[\]{}]+|[\s.,;:!?"“”‘’()[\]{}]+$/g, '');
  if (!word || word.length > 120 || word.split(/\s+/).length > 12 || !/\p{L}/u.test(word)) return null;
  return word;
}

export function vocabularyAnchor(rect: { left: number; bottom: number }, width: number, height: number) {
  return { left: Math.max(12, Math.min(rect.left, width - 168)), top: Math.max(12, Math.min(rect.bottom + 8, height - 52)) };
}
