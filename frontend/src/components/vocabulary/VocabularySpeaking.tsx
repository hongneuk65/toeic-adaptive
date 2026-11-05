import { useCallback, useEffect, useRef, useState } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import { SpeakingRecorder } from '../listening/SpeakingRecorder';
import { BrowserSpeechInput } from './BrowserSpeechInput';
import { useAuth } from '../../auth/useAuth';

interface SpeakingCard { id: number; word: string; meaning: string; phonetic?: string; example?: string }
interface SpeakingFeedback { feedback: string; correctedSentence: string; followUpQuestion: string; generationStatus: 'generated'; pronunciationAssessed: false }

export function VocabularySpeaking({ card, onBusyChange }: { card: SpeakingCard; onBusyChange?(busy: boolean): void }) {
  const { user } = useAuth();
  return <SpeakingExercise key={`${user?.id}:${card.id}`} card={card} userId={user?.id ?? 0} onBusyChange={onBusyChange} />;
}

function SpeakingExercise({ card, userId, onBusyChange }: { card: SpeakingCard; userId: number; onBusyChange?(busy: boolean): void }) {
  const draftKey = `toeic:vocabulary-speaking:${userId}:${card.id}`;
  const [response, setResponse] = useState(() => {
    try { return sessionStorage.getItem(draftKey)?.slice(0, 1000) ?? ''; } catch { return ''; }
  });
  const [feedback, setFeedback] = useState<SpeakingFeedback | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [audioError, setAudioError] = useState('');
  const [recorded, setRecorded] = useState(false);
  const [speechActive, setSpeechActive] = useState(false);
  const [aiFeedbackAvailable, setAiFeedbackAvailable] = useState<boolean | null>(null);
  const request = useRef<AbortController | null>(null);
  const onRecorded = useCallback(() => setRecorded(true), []);
  useEffect(() => {
    const controller = new AbortController();
    void api<{ aiFeedbackAvailable?: boolean }>('/vocabulary/practice-capabilities', { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted && typeof value.aiFeedbackAvailable === 'boolean') setAiFeedbackAvailable(value.aiFeedbackAvailable);
    }).catch(() => { /* Unknown availability is checked authoritatively when submitting. */ });
    return () => controller.abort();
  }, []);
  useEffect(() => { onBusyChange?.(pending || speechActive); return () => onBusyChange?.(false); }, [pending, speechActive, onBusyChange]);
  useEffect(() => () => {
    request.current?.abort();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);
  const updateResponse = (value: string) => {
    const next = value.slice(0, 1000); setResponse(next); setFeedback(null); setError('');
    try { if (next) sessionStorage.setItem(draftKey, next); else sessionStorage.removeItem(draftKey); } catch { /* Manual typing still works without browser storage. */ }
  };

  const listen = (text: string) => {
    setAudioError('');
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setAudioError('Trình duyệt chưa hỗ trợ giọng đọc. Bạn vẫn có thể đọc câu mẫu và ghi âm.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = .85;
    utterance.onerror = event => {
      if (event.error !== 'canceled' && event.error !== 'interrupted') setAudioError('Chưa phát được giọng đọc. Hãy thử lại hoặc dùng trình duyệt có giọng tiếng Anh.');
    };
    window.speechSynthesis.speak(utterance);
  };
  const submit = async () => {
    const sentence = response.trim();
    if (!sentence || request.current || speechActive || aiFeedbackAvailable === false) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(true); setError(''); setFeedback(null);
    try {
      const value = await api<SpeakingFeedback>('/vocabulary/practice-feedback', {
        method: 'POST', signal: controller.signal, data: { cardId: card.id, response: sentence },
      });
      if (controller.signal.aborted || request.current !== controller) return;
      if (value.generationStatus !== 'generated' || value.pronunciationAssessed !== false || !value.feedback || !value.correctedSentence || !value.followUpQuestion) throw new Error('AI chưa trả về góp ý hợp lệ. Hãy thử lại.');
      setFeedback(value);
    } catch (cause) {
      if (!controller.signal.aborted && request.current === controller) setError(getErrorMessage(cause, 'Chưa nhận được góp ý AI. Bạn vẫn có thể tự nghe lại bản ghi.'));
    } finally {
      if (request.current === controller) { request.current = null; setPending(false); }
    }
  };

  return <section aria-label="Luyện nói với từ vựng" className="learning-surface vocabulary-recall space-y-5 p-5 sm:p-8">
    <header className="space-y-2">
      <p className="text-sm text-ink-medium">Nói một câu về công việc có dùng từ</p>
      <h2 className="text-2xl font-semibold text-ink-dark break-words">{card.word}</h2>
      <p className="text-sm text-ink-medium break-words">{card.meaning}{card.phonetic ? ` · ${card.phonetic}` : ''}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="secondary-button" onClick={() => listen(card.word)}>Nghe từ</button>
        {card.example && <button type="button" className="secondary-button" onClick={() => listen(card.example!)}>Nghe câu mẫu</button>}
      </div>
      {card.example && <details className="text-sm"><summary className="cursor-pointer py-2">Câu mẫu</summary><p className="break-words">{card.example}</p></details>}
      {audioError && <p role="alert" className="text-sm text-rose-800">{audioError}</p>}
    </header>
    <details className="text-sm"><summary className="cursor-pointer py-2">Ghi âm để tự nghe lại</summary><fieldset disabled={pending || speechActive} className="min-w-0"><SpeakingRecorder maximumSeconds={60} onRecorded={onRecorded} /></fieldset></details>
    {recorded && <p role="status" className="text-sm text-ink-medium">Bạn có thể nghe lại bản ghi, rồi gõ hoặc nói để nhập câu.</p>}
    <BrowserSpeechInput disabled={pending} onActiveChange={setSpeechActive} onTranscript={text => {
      const next = `${response.trim()}${response.trim() ? ' ' : ''}${text}`;
      updateResponse(next);
      if (next.length > 1000) setError('Câu đã đạt giới hạn 1.000 ký tự; phần vượt giới hạn chưa được thêm.');
    }} />
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <label htmlFor={`spoken-sentence-${card.id}`} className="block text-sm font-medium">Câu bạn vừa nói</label>
      <textarea id={`spoken-sentence-${card.id}`} value={response} maxLength={1000} rows={3} disabled={pending}
        onChange={event => updateResponse(event.target.value)}
        placeholder="Nhập câu để AI góp ý cách dùng từ…" aria-describedby={`speaking-privacy-${card.id}`}
        className="w-full rounded-lg border border-paper-kraft bg-paper-white px-4 py-3 text-base" />
      <p id={`speaking-privacy-${card.id}`} className="text-xs text-ink-medium">AI gia sư nhận phần chữ bạn nhập, không nhận bản ghi. Góp ý ngữ pháp và cách dùng từ, không chấm phát âm.</p>
      {aiFeedbackAvailable === false && <p role="status" className="text-sm text-ink-medium">Góp ý AI hiện chưa khả dụng. Bạn vẫn có thể luyện nói, nhập câu và tự nghe lại.</p>}
      <button type="submit" className="primary-button" disabled={pending || speechActive || aiFeedbackAvailable === false || !response.trim()}>{pending ? 'Đang nhận góp ý…' : 'Nhận góp ý AI'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
    {feedback && <div aria-label="Góp ý cách dùng từ bằng AI" className="space-y-3 border-t border-paper-kraft pt-4">
      <p className="text-sm text-ink-medium">AI góp ý từ phần chữ bạn nhập</p>
      <p className="break-words">{feedback.feedback}</p>
      <div><h3 className="font-semibold">Câu diễn đạt</h3><p className="break-words">{feedback.correctedSentence}</p></div>
      <div><h3 className="font-semibold">Thử nói tiếp</h3><p className="break-words">{feedback.followUpQuestion}</p></div>
    </div>}
  </section>;
}
