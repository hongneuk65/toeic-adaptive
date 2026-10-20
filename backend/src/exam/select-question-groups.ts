import { randomInt } from 'node:crypto';

interface GroupableQuestion { id: number; part: number; passage: string | null; audioUrl: string | null; content: string; stimulus?: unknown }

function sourcePosition(question: GroupableQuestion): number | undefined {
  const stimulus = question.stimulus;
  if (!stimulus || typeof stimulus !== 'object' || !('questionPosition' in stimulus)) return undefined;
  return typeof stimulus.questionPosition === 'number' ? stimulus.questionPosition : undefined;
}

export function selectQuestionGroups<T extends GroupableQuestion>(questions: T[], count: number, part: number): T[] {
  const grouped = new Map<string, T[]>();
  for (const question of questions) {
    const key = part === 3 || part === 4 ? question.audioUrl : part >= 6 ? question.passage : String(question.id);
    if (!key) continue;
    const group = grouped.get(key) || [];
    group.push(question); grouped.set(key, group);
  }
  const groups = [...grouped.values()];
  for (let i = groups.length - 1; i > 0; i--) {
    const j = randomInt(i + 1); [groups[i], groups[j]] = [groups[j], groups[i]];
  }
  // Exact subset sum keeps conversations and reading passages together.
  const choices = new Map<number, T[][]>([[0, []]]);
  for (const group of groups) {
    for (const [size, selected] of Array.from(choices.entries())) {
      const next = size + group.length;
      if (next <= count && !choices.has(next)) choices.set(next, [...selected, group]);
    }
    if (choices.has(count)) break;
  }
  return (choices.get(count) || []).flatMap(group => [...group].sort((a, b) => {
    const positionA = sourcePosition(a), positionB = sourcePosition(b);
    if (positionA !== undefined && positionB !== undefined) return positionA - positionB;
    if (part === 6) return Number(a.content.match(/\[(\d+)\]/)?.[1] || 0) - Number(b.content.match(/\[(\d+)\]/)?.[1] || 0);
    return a.id - b.id;
  }));
}
