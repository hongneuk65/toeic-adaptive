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
    <article className="rounded-xl border border-paper-kraft bg-white p-4 sm:p-5">
      <p className="text-sm font-medium text-ink-medium">{label}</p>
      <p className={`mt-3 font-display text-3xl font-semibold tracking-tight ${valueColors[tone]}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-light">{hint}</p>
    </article>
  );
}
