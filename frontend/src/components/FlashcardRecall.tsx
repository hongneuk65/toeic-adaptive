import { useRef, useState } from 'react';

export interface RecallAttempt {
  attemptId: string;
  recallMode: 'typed' | 'self_report';
  response?: string;
  elapsedMs?: number;
}

interface Props {
  card: { id: number; word: string; meaning: string; phonetic?: string; example?: string };
  pending: boolean;
  onReview: (id: number, known: boolean, attempt: RecallAttempt) => Promise<boolean>;
}

/** Keep the first committed response immutable across a failed network request. */
export function FlashcardRecall({ card, pending, onReview }: Props) {
  const [answer, setAnswer] = useState('');
  const [attempt, setAttempt] = useState<RecallAttempt | null>(null);
  const [saved, setSaved] = useState(false);
  const startedAt = useRef<number | null>(null);
  const begin = () => { startedAt.current ??= Date.now(); };
  const reveal = () => {
    if (attempt) return;
    setAttempt({ attemptId: crypto.randomUUID(), recallMode: 'typed', response: answer.trim(), elapsedMs: startedAt.current === null ? 0 : Math.min(86400000, Math.max(0, Date.now() - startedAt.current)) });
  };
  const save = async () => {
    if (!attempt || saved) return;
    if (await onReview(card.id, false, attempt)) setSaved(true);
  };
  return <section aria-label="Luyện nhớ chủ động" className="learning-surface space-y-5 p-5 sm:p-8">
    <div className="space-y-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-navy">Nhớ lại trước khi xem đáp án</p>
      <h2 className="text-2xl font-bold text-ink-dark break-words">{card.meaning}</h2>
      <p className="text-sm text-ink-medium">Từ hoặc cụm từ tiếng Anh tương ứng là gì?</p>
    </div>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); reveal(); }}>
      <label htmlFor={`recall-${card.id}`} className="block text-sm font-medium text-ink-dark">Câu trả lời của bạn</label>
      <input id={`recall-${card.id}`} value={answer} maxLength={200} onFocus={begin} onChange={event => { begin(); setAnswer(event.target.value); }} readOnly={!!attempt} autoComplete="off" autoCapitalize="none" spellCheck={false} className="w-full rounded-lg border border-paper-kraft bg-paper-white px-4 py-3 text-base" aria-describedby={`recall-help-${card.id}`} placeholder="Nhập từ bạn nhớ…" />
      <p id={`recall-help-${card.id}`} className="text-xs text-ink-medium">Nhập đúng từ hoặc cụm từ trên thẻ; không phân biệt chữ hoa và khoảng trắng thừa. Từ đồng nghĩa chưa được chấp nhận.</p>
      {!attempt && <div className="flex flex-wrap gap-3">
        <button type="submit" className="primary-button" disabled={!answer.trim()}>Kiểm tra đáp án</button>
        <button type="button" className="secondary-button" onClick={() => { setAnswer(''); setAttempt({ attemptId: crypto.randomUUID(), recallMode: 'typed', response: '', elapsedMs: startedAt.current === null ? 0 : Math.min(86400000, Math.max(0, Date.now() - startedAt.current)) }); }}>Chưa nhớ · xem đáp án</button>
      </div>}
    </form>
    {attempt && <div className="space-y-4 border-t border-paper-kraft pt-4">
      <div role="status" className="space-y-2">
        <p className="text-sm text-ink-medium">Đáp án</p>
        <p className="text-2xl font-bold text-accent-navy break-words">{card.word}</p>
        {card.phonetic && <p className="text-sm text-ink-medium">{card.phonetic}</p>}
        {card.example && <p className="text-sm italic text-ink-medium break-words">{card.example}</p>}
        <p className="text-sm text-ink-medium">{attempt.response ? <>Bạn đã trả lời: <strong>{attempt.response}</strong>. Hệ thống đối chiếu câu trả lời khi lưu.</> : 'Lượt này được ghi nhận là chưa nhớ.'}</p>
      </div>
      <button type="button" className="primary-button" onClick={() => void save()} disabled={pending || saved}>{pending ? 'Đang lưu…' : saved ? 'Đã lưu lượt ôn' : 'Lưu lượt ôn'}</button>
      <p className="text-xs text-ink-medium">Lịch ôn cá nhân hóa đang trong giai đoạn thử nghiệm, được tính từ kết quả trước khi xem đáp án. Bạn không cần tự đánh dấu đúng hoặc sai.</p>
    </div>}
  </section>;
}
