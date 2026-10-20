export function clozeAnswer(tokens: string[], values: Record<number, string>) {
  const blanks = tokens.flatMap((token, index) => token === '____' ? [values[index]?.trim() || ''] : []);
  return blanks.length && blanks.every(Boolean) ? blanks.join(' ') : '';
}

