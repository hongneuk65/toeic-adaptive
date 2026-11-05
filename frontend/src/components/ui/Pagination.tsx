interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  label?: string;
}

export function Pagination({ page, totalPages, onPageChange, label = 'Trang danh sách' }: PaginationProps) {
  const total = Math.max(1, Math.floor(totalPages) || 1);
  const current = Math.min(total, Math.max(1, Math.floor(page) || 1));
  if (total <= 1) return null;
  const selected = total <= 7 ? Array.from({ length: total }, (_, i) => i + 1)
    : [...new Set([1, total, current - 1, current, current + 1, ...(current <= 3 ? [2, 3, 4] : []), ...(current >= total - 2 ? [total - 3, total - 2, total - 1] : [])])].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
  const items: (number | string)[] = [];
  selected.forEach((value, index) => {
    const previous = selected[index - 1];
    if (index && value - previous === 2) items.push(previous + 1);
    else if (index && value - previous > 2) items.push(`gap-${value}`);
    items.push(value);
  });
  return <nav className="study-pagination" aria-label={label}>
    <button type="button" disabled={current === 1} onClick={() => onPageChange(current - 1)}>Trước</button>
    <div className="study-pagination-numbers">{items.map(item => typeof item === 'number'
      ? <button type="button" key={item} aria-label={`Trang ${item}`} aria-current={item === current ? 'page' : undefined} onClick={() => { if (item !== current) onPageChange(item); }}>{item}</button>
      : <span key={item} aria-hidden="true">…</span>)}</div>
    <button type="button" disabled={current === total} onClick={() => onPageChange(current + 1)}>Sau</button>
    <span className="sr-only" aria-live="polite">Trang {current} / {total}</span>
  </nav>;
}
