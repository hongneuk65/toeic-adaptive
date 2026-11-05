import { useEffect, useMemo, useRef, useState } from 'react';
import { api, getErrorMessage } from '../../lib/api';

export interface VocabularyPracticeCard {
  id: number; word: string; meaning: string; phonetic?: string; example?: string;
}
export interface VocabularyPracticeResult {
  attemptId: string; mode: 'quiz' | 'dictation'; cardId: number; correct: boolean;
  correctAnswer: string; meaning: string; phonetic?: string; example?: string;
  response: string; recordedAt: string; schedulingUpdated: false;
}
export interface VocabularyPracticeProps {
  mode: 'quiz' | 'dictation';
  card: VocabularyPracticeCard;
  cards: Pick<VocabularyPracticeCard, 'id' | 'word' | 'meaning'>[];
  onBusyChange?: (busy: boolean) => void;
  onCompleted?: () => void;
  onRecorded?: () => void;
}

function normalized(value: string) { return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US'); }
function rank(value: string) {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619);
  return result >>> 0;
}

/** The inner key resets answers and cancels speech/fetch when the visible question changes. */
export function VocabularyPractice(props: VocabularyPracticeProps) {
  return <PracticeQuestion key={`${props.mode}:${props.card.id}:${props.card.word}`} {...props} />;
}

function PracticeQuestion({ mode, card, cards, onBusyChange, onCompleted, onRecorded }: VocabularyPracticeProps) {
  const [attemptId] = useState(() => crypto.randomUUID());
  const [response, setResponse] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [result, setResult] = useState<VocabularyPracticeResult | null>(null);
  const [committed, setCommitted] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [heard, setHeard] = useState(false);
  const startedAt = useRef<number | null>(null);
  const request = useRef<{ attemptId: string; mode: 'quiz' | 'dictation'; response: string; elapsedMs: number } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const speech = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const busyCallback = useRef(onBusyChange);
  useEffect(() => { busyCallback.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controller.current?.abort();
      clearTimeout(speechTimer.current);
      speech.current = null;
      if (mode === 'dictation' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      busyCallback.current?.(false);
    };
  }, [mode]);
  const options = useMemo(() => {
    const words = new Map<string, string>();
    words.set(normalized(card.word), card.word);
    for (const candidate of [...cards].sort((a, b) => rank(attemptId + a.word) - rank(attemptId + b.word))) {
      const key = normalized(candidate.word);
      // Equal meanings would make multiple options valid under the same prompt.
      if (key && !words.has(key) && normalized(candidate.meaning) !== normalized(card.meaning)) words.set(key, candidate.word);
      if (words.size === 4) break;
    }
    return [...words.values()].sort((a, b) => rank(a + attemptId) - rank(b + attemptId));
  }, [attemptId, card.word, card.meaning, cards]);
  const quizAvailable = mode !== 'quiz' || options.length >= 2;
  const begin = () => { startedAt.current ??= Date.now(); };
  const play = () => {
    if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
      setAudioError('Trình duyệt chưa hỗ trợ đọc từ. Bạn có thể chuyển sang cách học khác.');
      return;
    }
    begin();
    setAudioError('');
    speech.current = null;
    window.speechSynthesis.cancel();
    clearTimeout(speechTimer.current);
    const utterance = new SpeechSynthesisUtterance(card.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    speech.current = utterance;
    const finish = () => { if (speech.current !== utterance) return; clearTimeout(speechTimer.current); if (mounted.current) setPlaying(false); };
    utterance.onstart = () => { if (mounted.current && speech.current === utterance) { setHeard(true); setPlaying(true); } };
    utterance.onend = finish;
    utterance.onerror = () => { if (speech.current !== utterance) return; finish(); if (mounted.current) setAudioError('Chưa phát được từ. Thử lại hoặc chuyển sang cách học khác.'); };
    speechTimer.current = setTimeout(() => {
      window.speechSynthesis.cancel();
      finish();
      if (mounted.current) setAudioError('Giọng đọc chưa sẵn sàng. Thử lại hoặc chọn cách học khác.');
    }, 15000);
    window.speechSynthesis.speak(utterance);
  };
  const submit = async (skip = false) => {
    if (controller.current || result || !quizAvailable || (!request.current && !skip && !response.trim())) return;
    if (mode === 'dictation' && !heard && !skip) return;
    begin();
    request.current ??= { attemptId, mode, response: skip ? '' : response.trim(), elapsedMs: Math.min(86400000, Math.max(0, Date.now() - startedAt.current!)) };
    setCommitted(true);
    setPending(true);
    setError('');
    busyCallback.current?.(true);
    const active = new AbortController();
    controller.current = active;
    try {
      const data = await api<VocabularyPracticeResult>(`/flashcards/cards/${card.id}/practice`, { method: 'POST', data: request.current, signal: active.signal });
      if (!mounted.current || active.signal.aborted) return;
      setResult(data);
      busyCallback.current?.(Boolean(onCompleted));
      onRecorded?.();
    } catch (cause) {
      if (!mounted.current || active.signal.aborted) return;
      setError(`${getErrorMessage(cause)} Câu trả lời đã giữ lại; bấm Thử lưu lại để gửi đúng lượt này.`);
    } finally {
      if (controller.current === active) controller.current = null;
      if (mounted.current) setPending(false);
    }
  };
  return <section aria-label={mode === 'quiz' ? 'Trắc nghiệm từ vựng' : 'Nghe và gõ từ'} className="learning-surface vocabulary-recall space-y-5 p-5 sm:p-8">
    <div className="space-y-2 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-navy">{mode === 'quiz' ? 'Chọn từ phù hợp' : 'Nghe và gõ từ'}</p>
      {mode === 'quiz' ? <h2 className="text-2xl font-bold text-ink-dark break-words">{card.meaning}</h2> : <div className="space-y-2"><button type="button" className="secondary-button" disabled={playing || pending} onClick={play}>{playing ? 'Đang đọc…' : 'Nghe từ'}</button><p className="text-xs text-ink-medium">Giọng đọc của trình duyệt · tiếng Anh</p></div>}
    </div>
    {audioError && <p role="alert" className="text-sm text-rose-800">{audioError}</p>}
    {!quizAvailable ? <p role="status" className="text-sm text-ink-medium">Cần ít nhất hai từ khác nhau trong bộ từ để tạo trắc nghiệm.</p> : <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
      {mode === 'quiz' ? <fieldset disabled={committed || pending} className="space-y-2"><legend className="sr-only">Chọn từ tiếng Anh tương ứng</legend>{options.map(option => <label key={option} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-paper-kraft bg-paper-white p-3 text-sm text-ink-dark has-[:checked]:border-accent-navy has-[:focus-visible]:outline has-[:focus-visible]:outline-2"><input type="radio" name={`vocabulary-option-${attemptId}`} value={option} checked={response === option} onChange={() => { begin(); setResponse(option); }} /><span className="break-words">{option}</span></label>)}</fieldset> : <><label htmlFor={`dictation-${attemptId}`} className="block text-sm font-medium text-ink-dark">Từ bạn nghe được</label><input id={`dictation-${attemptId}`} value={response} onChange={event => { begin(); setResponse(event.target.value); }} maxLength={200} readOnly={committed} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Nhập từ bạn nghe…" className="w-full rounded-lg border border-paper-kraft bg-paper-white px-4 py-3 text-base" /><p className="text-xs text-ink-medium">Nghe từ trước khi kiểm tra; đáp án chỉ hiện sau khi lưu.</p></>}
      {!committed && <div className="flex flex-wrap gap-3"><button type="submit" className="primary-button" disabled={!response.trim() || (mode === 'dictation' && !heard)}>Kiểm tra đáp án</button><button type="button" className="secondary-button" onClick={() => void submit(true)}>Chưa biết</button></div>}
      {pending && <p role="status" className="text-sm text-ink-medium">Đang lưu lượt luyện…</p>}
      {error && <div role="alert" className="space-y-2 text-sm text-rose-800"><p>{error}</p><button type="button" className="secondary-button" disabled={pending} onClick={() => void submit()}>Thử lưu lại</button></div>}
    </form>}
    {result && <div role="status" className="space-y-2 border-t border-paper-kraft pt-4"><p className="font-semibold text-ink-dark">{result.correct ? 'Chính xác' : result.response ? 'Cần luyện thêm' : 'Đã lưu lượt chưa biết'}</p><p className="text-2xl font-bold text-accent-navy break-words">{result.correctAnswer}</p><p className="text-sm text-ink-medium break-words">{result.meaning}</p>{result.phonetic && <p className="text-sm text-ink-medium">{result.phonetic}</p>}{result.example && <p className="text-sm italic text-ink-medium break-words">{result.example}</p>}<p className="text-xs text-ink-medium">Đã lưu riêng lượt luyện; lịch ôn nhớ từ vẫn dựa trên kiểm tra viết theo nghĩa.</p>{onCompleted && <button type="button" className="primary-button" disabled={acknowledged} onClick={() => { setAcknowledged(true); busyCallback.current?.(false); onCompleted(); }}>Tiếp tục</button>}</div>}
  </section>;
}
