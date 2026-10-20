import type { PartMasteryItem } from '../../types/mastery';
import { PART_META } from '../../types/mastery';
export function PartsRankingGrid({ sortedParts, onPracticePart }: { sortedParts: PartMasteryItem[]; onPracticePart(part: number): void }) {
  return <ul className="divide-y divide-paper-kraft/50">{sortedParts.map(part => <li key={part.part} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">{PART_META[part.part]?.title.split(' (')[0] || part.partName}</h3><p className="mt-1 text-sm text-ink-medium">{PART_META[part.part]?.description}</p></div><button className="secondary-button" onClick={() => onPracticePart(part.part)}>Luyện Part {part.part}</button></li>)}</ul>;
}