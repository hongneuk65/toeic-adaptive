import { useState } from 'react';

export function ListeningRangeForm({ start, end, maximum, busy, active, onApply }: { start: number; end: number; maximum: number; busy: boolean; active: boolean; onApply(start: number, end: number): void }) {
  const [from, setFrom] = useState(String(start));
  const [to, setTo] = useState(String(end));
  const [error, setError] = useState('');
  return <form className="space-y-3" onSubmit={event => {
    event.preventDefault();
    const nextStart = Number(from), nextEnd = Number(to);
    if (!from.trim() || !to.trim() || !Number.isFinite(nextStart) || !Number.isFinite(nextEnd) || nextStart < 0 || nextEnd > 86400 || nextEnd <= nextStart || nextEnd - nextStart > maximum) {
      setError(`Chọn mốc kết thúc sau mốc bắt đầu, tối đa ${maximum} giây.`); return;
    }
    setError(''); onApply(nextStart, nextEnd);
  }}>
    <div className="flex flex-wrap items-end gap-3">
      <label className="text-sm">Bắt đầu (giây)<input type="number" aria-label="Bắt đầu đoạn" required disabled={busy} min="0" max="86400" value={from} onChange={event => setFrom(event.target.value)} className="form-input w-28" /></label>
      <label className="text-sm">Kết thúc (giây)<input type="number" aria-label="Kết thúc đoạn" required disabled={busy} min="1" max="86400" value={to} onChange={event => setTo(event.target.value)} className="form-input w-28" /></label>
      <button disabled={busy} className={active ? 'secondary-button' : 'primary-button'}>{busy ? 'Đang chuẩn bị…' : 'Luyện đoạn này'}</button>
    </div>
    <p className="text-xs text-ink-medium">Chỉ áp dụng khi bấm Luyện đoạn này. Đoạn 15–30 giây thường chuẩn bị nhanh hơn.</p>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </form>;
}
