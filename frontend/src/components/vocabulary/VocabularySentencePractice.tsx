import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../auth/useAuth';
import { api, getErrorMessage } from '../../lib/api';

interface SentenceCard { id: number; word: string; meaning: string; example?: string }
interface SentenceFeedback { feedback: string; correctedSentence: string; followUpQuestion: string; generationStatus: 'generated'; pronunciationAssessed: false }
interface SentencePracticeProps { card: SentenceCard; onBusyChange?: (busy: boolean) => void; onCompleted?: () => void }

function readDraft(key: string | null, word: string) {
  if (!key) return '';
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (value && typeof value === 'object' && 'word' in value && value.word === word && 'response' in value && typeof value.response === 'string' && value.response.length <= 1000) return value.response;
  } catch { /* Storage can be unavailable; the live draft remains usable. */ }
  return '';
}
function validatedFeedback(value: unknown): SentenceFeedback {
  if (!value || typeof value !== 'object') throw new Error('AI chưa trả về góp ý hợp lệ. Hãy thử lại.');
  const result = value as Partial<SentenceFeedback>;
  if (result.generationStatus !== 'generated' || result.pronunciationAssessed !== false
    || ![result.feedback, result.correctedSentence, result.followUpQuestion].every(field => typeof field === 'string' && field.trim().length > 0)) throw new Error('AI chưa trả về góp ý hợp lệ. Hãy thử lại.');
  return result as SentenceFeedback;
}

export function VocabularySentencePractice(props: SentencePracticeProps) {
  const { user } = useAuth();
  return <SentenceExercise key={`${user?.id ?? 'anonymous'}:${props.card.id}:${props.card.word}`} {...props} userId={user?.id} />;
}

function SentenceExercise({ card, userId, onBusyChange, onCompleted }: SentencePracticeProps & { userId?: number }) {
  const storageKey = userId === undefined ? null : `toeic:vocabulary-sentence:${userId}:${card.id}`;
  const [response, setResponse] = useState(() => readDraft(storageKey, card.word));
  const [feedback, setFeedback] = useState<SentenceFeedback | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [completed, setCompleted] = useState(false);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const acknowledged = useRef(false);
  const busyCallback = useRef(onBusyChange);
  useEffect(() => { busyCallback.current = onBusyChange; }, [onBusyChange]);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    void api<{ aiFeedbackAvailable?: boolean }>('/vocabulary/practice-capabilities', { signal: controller.signal })
      .then(value => {
        if (mounted.current && !controller.signal.aborted && typeof value.aiFeedbackAvailable === 'boolean') setAiAvailable(value.aiFeedbackAvailable);
      }).catch(() => { /* The submit endpoint remains authoritative when capabilities cannot be read. */ });
    return () => {
      mounted.current = false;
      controller.abort();
      request.current?.abort();
      request.current = null;
      busyCallback.current?.(false);
    };
  }, []);
  useEffect(() => {
    if (!storageKey || acknowledged.current) return;
    try {
      if (response) sessionStorage.setItem(storageKey, JSON.stringify({ word: card.word, response }));
      else sessionStorage.removeItem(storageKey);
    } catch { /* Do not prevent writing or retrying if session storage is blocked. */ }
  }, [storageKey, card.word, response]);

  const submit = async () => {
    const sentence = response.trim();
    if (!sentence || request.current || acknowledged.current || aiAvailable === false || feedback) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError('');
    busyCallback.current?.(true);
    try {
      const value = await api<unknown>('/vocabulary/practice-feedback', {
        method: 'POST', signal: controller.signal, data: { cardId: card.id, response: sentence },
      });
      if (!mounted.current || controller.signal.aborted || request.current !== controller) return;
      setFeedback(validatedFeedback(value));
    } catch (cause) {
      if (mounted.current && !controller.signal.aborted && request.current === controller) setError(getErrorMessage(cause, 'Chưa nhận được góp ý. Câu bạn viết vẫn được giữ để thử lại.'));
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (mounted.current) setPending(false);
        busyCallback.current?.(false);
      }
    }
  };
  const complete = () => {
    if (request.current || acknowledged.current || !response.trim()) return;
    acknowledged.current = true;
    setCompleted(true);
    try { if (storageKey) sessionStorage.removeItem(storageKey); } catch { /* The local practice can still finish. */ }
    busyCallback.current?.(false);
    onCompleted?.();
  };

  return <section aria-label="Đặt câu với từ vựng" className="learning-surface vocabulary-recall vocabulary-sentence space-y-5 p-5 sm:p-8">
    <header className="space-y-2">
      <p className="text-sm text-ink-medium">Viết một câu có dùng từ</p>
      <h2 className="text-2xl font-semibold text-ink-dark break-words">{card.word}</h2>
      <p className="text-sm text-ink-medium break-words">{card.meaning}</p>
    </header>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label htmlFor={`vocabulary-sentence-${card.id}`} className="block text-sm font-medium">Câu tiếng Anh của bạn</label>
      <textarea id={`vocabulary-sentence-${card.id}`} value={response} maxLength={1000} rows={3}
        disabled={pending || completed} aria-describedby={`vocabulary-sentence-help-${card.id}`}
        onChange={event => { setResponse(event.target.value); setFeedback(null); setError(''); }}
        placeholder={`Đặt một câu với “${card.word}”…`}
        className="w-full rounded-lg border border-paper-kraft bg-paper-white px-4 py-3 text-base" />
      <p id={`vocabulary-sentence-help-${card.id}`} className="text-xs text-ink-medium">AI nhận câu bạn nhập để góp ý cách dùng từ và ngữ pháp.</p>
      {aiAvailable === false && <p role="status" className="text-sm text-ink-medium">AI chưa được cấu hình. Bạn vẫn có thể tự đặt câu và học tiếp.</p>}
      <button type="submit" className="primary-button" disabled={pending || completed || !response.trim() || aiAvailable === false || feedback !== null}>{pending ? 'Đang nhận góp ý…' : 'Nhận góp ý AI'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    {feedback && <div aria-label="Góp ý câu viết bằng AI" className="space-y-3 border-t border-paper-kraft pt-4">
      <p className="break-words">{feedback.feedback}</p>
      <div><h3 className="font-semibold">Câu diễn đạt</h3><p className="break-words">{feedback.correctedSentence}</p></div>
      <div><h3 className="font-semibold">Thử viết tiếp</h3><p className="break-words">{feedback.followUpQuestion}</p></div>
    </div>}
    {card.example && <details className="text-sm"><summary className="cursor-pointer py-2">Câu mẫu</summary><p className="break-words">{card.example}</p></details>}
    <div className="vocabulary-sentence-completion">
      <p className="text-xs text-ink-medium">Luyện đặt câu không cập nhật điểm nhớ từ.</p>
      {onCompleted && <button type="button" className="secondary-button" disabled={pending || completed || !response.trim()} onClick={complete}>{completed ? 'Đã xong câu này' : 'Tiếp tục'}</button>}
    </div>
  </section>;
}
