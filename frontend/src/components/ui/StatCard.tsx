type StatTone = 'coral' | 'navy' | 'sage' | 'ink';

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  tone?: StatTone;
}

const valueColors: Record<StatTone, string> = {
  coral: 'text-accent-coral',
  navy: 'text-accent-navy',
  sage: 'text-accent-sage',
  ink: 'text-ink-dark',
};

export function StatCard({ label, value, hint, tone = 'ink' }: StatCardProps) {
  return (
    <article className="min-w-0 border-l-2 border-paper-kraft px-4 py-2 sm:px-5">
      <p className="text-sm font-medium text-ink-medium">{label}</p>
      <p className={`mt-2 break-words font-display text-3xl font-semibold tracking-tight tabular-nums ${valueColors[tone]}`}>{value}</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-medium">{hint}</p>
    </article>
  );
}
