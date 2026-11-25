import { useVocabularyTutorDraft } from './rag/useTutorContext';
import { useEffect, useRef, useState } from 'react';

export interface RecallAttempt {
  attemptId: string;
  recallMode: 'typed' | 'self_report';
  response?: string;
  elapsedMs?: number;
}

interface Props {
  card: { id: number; word: string; meaning: string; phonetic?: string; example?: string };
  /** Other words in the folder; used to warn when several words share this meaning. */
  siblings?: { id: number; word: string; meaning: string }[];
  pending: boolean;
  onBusyChange?: (busy: boolean) => void;
  onCompleted?: () => void;
  onReview: (id: number, known: boolean, attempt: RecallAttempt) => Promise<boolean>;
}

/** Keep the first committed response immutable across a failed network request. */
const normalizeRecall = (value: string) => value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/[’‘]/g, "'").replace(/\s+/g, ' ');

export function FlashcardRecall({ card, siblings = [], pending, onReview, onBusyChange, onCompleted }: Props) {
  const [answer, setAnswer] = useState('');
  useVocabularyTutorDraft(card.id, answer);
  const [attempt, setAttempt] = useState<RecallAttempt | null>(null);
  const [saved, setSaved] = useState(false);
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    onBusyChange?.(Boolean(attempt));
    return () => onBusyChange?.(false);
  }, [attempt, onBusyChange]);
  const begin = () => { startedAt.current ??= Date.now(); };
  const save = async (current: RecallAttempt | null = attempt) => {
    if (!current || saved) return;
    if (await onReview(card.id, false, current)) setSaved(true);
  };
  const commit = (response: string) => {
    if (attempt) return;
    const next: RecallAttempt = { attemptId: crypto.randomUUID(), recallMode: 'typed', response, elapsedMs: startedAt.current === null ? 0 : Math.min(86400000, Math.max(0, Date.now() - startedAt.current)) };
    setAttempt(next);
    void save(next);
  };
  const reveal = () => commit(answer.trim());
  const correct = Boolean(attempt?.response) && normalizeRecall(attempt?.response ?? '') === normalizeRecall(card.word);
  const sameMeaning = siblings.some(other => other.id !== card.id && normalizeRecall(other.meaning) === normalizeRecall(card.meaning));
  const hint = sameMeaning ? `Nghĩa này trùng với từ khác trong thư mục. Gợi ý: từ cần nhập bắt đầu bằng “${card.word.trim().charAt(0)}” và có ${card.word.trim().length} ký tự.` : '';
  return <section aria-label="Luyện nhớ chủ động" className="learning-surface vocabulary-recall space-y-5 p-5 sm:p-8">
    <div className="space-y-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-navy">Nhớ từ này?</p>
      <h2 className="text-2xl font-bold text-ink-dark break-words">{card.meaning}</h2>

    </div>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); reveal(); }}>
      <label htmlFor={`recall-${card.id}`} className="block text-sm font-medium text-ink-dark">Câu trả lời của bạn</label>
      <input id={`recall-${card.id}`} value={answer} maxLength={200} onFocus={begin} onChange={event => { begin(); setAnswer(event.target.value); }} readOnly={!!attempt} autoComplete="off" autoCapitalize="none" spellCheck={false} className="w-full rounded-lg border border-paper-kraft bg-paper-white px-4 py-3 text-base" aria-describedby={`recall-help-${card.id}`} placeholder="Nhập từ bạn nhớ…" />
      <p id={`recall-help-${card.id}`} className="text-xs text-ink-medium">Gõ từ tiếng Anh có nghĩa trên. Không phân biệt chữ hoa, chữ thường.</p>
      {hint && <p className="text-xs text-accent-navy">{hint}</p>}
      {!attempt && <div className="flex flex-wrap gap-3">
        <button type="submit" className="primary-button" disabled={!answer.trim()}>Kiểm tra đáp án</button>
        <button type="button" className="secondary-button" onClick={() => { setAnswer(''); commit(''); }}>Chưa nhớ · xem đáp án</button>
      </div>}
    </form>
    {attempt && <div className="space-y-4 border-t border-paper-kraft pt-4">
      <div role="status" className="space-y-2">
        <p className={`text-base font-semibold ${correct ? 'text-accent-navy' : 'text-ink-dark'}`}>{correct ? '✓ Chính xác' : attempt.response ? '✗ Chưa đúng' : 'Đáp án'}</p>
        <p className="text-2xl font-bold text-accent-navy break-words">{card.word}</p>
        {card.phonetic && <p className="text-sm text-ink-medium">{card.phonetic}</p>}
        {card.example && <p className="text-sm italic text-ink-medium break-words">{card.example}</p>}
        {attempt.response && !correct && <p className="text-sm text-ink-medium">Bạn đã trả lời: <strong>{attempt.response}</strong></p>}
        {!attempt.response && <p className="text-sm text-ink-medium">Lượt này được ghi nhận là chưa nhớ.</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {saved && onCompleted && <button type="button" className="primary-button" onClick={onCompleted}>Từ tiếp theo</button>}
        {!saved && <button type="button" className="secondary-button" onClick={() => void save()} disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu lại lượt ôn'}</button>}
        {saved && <span className="text-xs text-ink-medium">Đã lưu. Lần ôn tiếp theo được tính từ câu trả lời này.</span>}
      </div>
    </div>}
  </section>;
}
