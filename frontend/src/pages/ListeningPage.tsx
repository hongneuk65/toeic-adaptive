import { MediaButton } from '../components/ui/MediaButton';
import { Pagination } from '../components/ui/Pagination';
import { notifyLearningProgress } from '../lib/learning-progress';
import { ActivitySuggestions } from '../components/ActivitySuggestions';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, apiUpload, ApiError, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useAuth } from '../auth/useAuth';
import { ListeningPlayer, type ListeningPlayerHandle } from '../components/listening/ListeningPlayer';
import { SpeakingRecorder } from '../components/listening/SpeakingRecorder';
import { ListeningAudioCapture } from '../components/listening/ListeningAudioCapture';
import { ListeningAdmin } from '../components/listening/ListeningAdmin';
import { ListeningRangeForm } from '../components/listening/ListeningRangeForm';
import { ListeningCloze } from '../components/listening/ListeningCloze';
import { clozeAnswer } from '../lib/listening-cloze';
import { PageHeader } from '../components/ui/PageHeader';
import '../styles/prep-learning.css';
import '../styles/practice-studio.css';
import type { ListeningCatalog, ListeningFeedback, ListeningSession, ListeningSource, SourceStatus } from '../types/listening';

function time(value: number) { return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }

interface AnswerRequest { requestId: string; unitId: number; mode: ListeningSession['mode']; difficulty: ListeningSession['difficulty']; answer: string }
interface ListeningDraft { answer: string; blanks: Record<number, string>; pending?: AnswerRequest }
function readDraft(key: string, session: ListeningSession): ListeningDraft {
  const empty = { answer: '', blanks: {} };
  try {
    const raw: unknown = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!raw || typeof raw !== 'object') return empty;
    const draft = raw as Partial<ListeningDraft>;
    const blanks = draft.blanks && typeof draft.blanks === 'object' && !Array.isArray(draft.blanks)
      ? Object.fromEntries(Object.entries(draft.blanks).filter(([index, value]) => /^\d+$/.test(index) && Number(index) < (session.unit?.tokens?.length ?? 0) && typeof value === 'string' && value.length <= 60)) : {};
    const pending = draft.pending;
    return { answer: typeof draft.answer === 'string' ? draft.answer.slice(0, 3000) : '', blanks,
      ...(pending && typeof pending.requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pending.requestId)
        && pending.unitId === session.unit?.id && pending.mode === session.mode && pending.difficulty === session.difficulty
        && typeof pending.answer === 'string' && pending.answer.length <= 3000 ? { pending: { requestId: pending.requestId, unitId: pending.unitId, mode: pending.mode, difficulty: pending.difficulty, answer: pending.answer } } : {}) };
  } catch { return empty; }
}
function writeDraft(key: string, draft: ListeningDraft | null) {
  try { if (draft) sessionStorage.setItem(key, JSON.stringify(draft)); else sessionStorage.removeItem(key); } catch { /* Storage can be unavailable; in-memory editing still works. */ }
}
function Exercise({ userId, session, play, change, act, busy, heard }: { userId: number; session: ListeningSession; play(start: number, end: number): void; change(value: ListeningSession): void; act(action: () => Promise<void>): Promise<void>; busy: boolean; heard: boolean }) {
  const draftKey = `toeic:listening-draft:${userId}:${session.id}:${session.unit?.id ?? 'pending'}:${session.mode}:${session.difficulty}`;
  const [draft, setDraft] = useState(() => readDraft(draftKey, session));
  const [pending, setPending] = useState<AnswerRequest | null>(draft.pending ?? null);
  const pendingRequest = useRef<AnswerRequest | null>(draft.pending ?? null);
  const [feedback, setFeedback] = useState<ListeningFeedback | null>(draft.pending || draft.answer || Object.keys(draft.blanks).length ? null : session.feedback || null); const [hint, setHint] = useState(''); const [recorded, setRecorded] = useState(false);
  const [shadowingText, setShadowingText] = useState('');
  const answer = draft.answer; const blanks = draft.blanks;
  const locked = busy || !!pending;
  const updateDraft = (next: ListeningDraft) => { setDraft(next); writeDraft(draftKey, next); setFeedback(null); };
  const unit = session.unit;
  if (!unit) return <p className="rounded border border-paper-kraft bg-paper-cream p-5 text-sm">Chưa có câu luyện trong đoạn này. Hệ thống sẽ cập nhật bài khi lời thoại sẵn sàng; bạn có thể nghe trong lúc chờ hoặc chọn đoạn khác.</p>;
  const submittedAnswer = session.mode === 'CLOZE' ? clozeAnswer(unit.tokens || [], blanks) : answer;
  const patch = async (data: object) => change(await api<ListeningSession>(`/listening/sessions/${session.id}`, { method: 'PATCH', data }));
  const submit = async () => {
    const request = pendingRequest.current ?? { requestId: crypto.randomUUID(), unitId: unit.id, mode: session.mode, difficulty: session.difficulty, answer: submittedAnswer };
    pendingRequest.current = request; setPending(request); writeDraft(draftKey, { ...draft, pending: request });
    try {
      const result = await api<ListeningFeedback>(`/listening/sessions/${session.id}/answers`, { method: 'POST', data: request });
      setFeedback(result); pendingRequest.current = null; setPending(null); writeDraft(draftKey, null); notifyLearningProgress();
    } catch (cause) {
      if (cause instanceof ApiError && [400, 409, 413, 422].includes(cause.status)) {
        pendingRequest.current = null; setPending(null);
        const editableDraft = { answer: draft.answer, blanks: draft.blanks };
        setDraft(editableDraft); writeDraft(draftKey, editableDraft);
      }
      throw cause;
    }
  };
  return <section className="prep-question-surface page-section space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Đoạn {session.currentIndex + 1} / {session.totalUnits} <span className="ml-2 text-sm font-normal text-ink-light">{time(unit.start)}–{time(unit.end)}</span></h2>
      <MediaButton label="Nghe đoạn này" onClick={() => play(unit.start, unit.end)} />
    </div>
    <details className="listening-exercise-settings section-disclosure"><summary>Thiết lập bài luyện</summary><div className="flex flex-wrap gap-2">
        <select aria-label="Chế độ luyện" value={session.mode} disabled={locked} onChange={event => void act(() => patch({ mode: event.target.value }))} className="form-input !border !py-2">
          <option value="CLOZE">Điền từ thiếu</option><option value="DICTATION">Dictation · chép lời thoại</option><option value="SPEAK">Shadowing · nói theo</option>
        </select>
        {session.mode === 'CLOZE' && <select aria-label="Mức độ bài luyện" value={session.difficulty} disabled={locked} onChange={event => void act(() => patch({ difficulty: event.target.value }))} className="rounded border border-paper-kraft p-2 text-sm"><option value="EASY">Dễ</option><option value="MEDIUM">Vừa</option><option value="HARD">Khó</option></select>}
      </div></details>
    <details className="text-xs text-ink-medium"><summary>Cách luyện</summary><p>Dictation và điền từ giữ ẩn lời thoại trước khi trả lời; Shadowing cho phép mở mẫu để nói theo. Phụ đề YouTube do trình phát quản lý.</p></details>
    {session.mode === 'CLOZE' && (heard ? <><p className="text-sm text-ink-medium">Điền trực tiếp vào từng chỗ trống. Dùng Tab để chuyển ô.</p><ListeningCloze tokens={unit.tokens || []} values={blanks} disabled={locked} onChange={(index, value) => updateDraft({ answer, blanks: { ...blanks, [index]: value } })} /></> : <p className="text-sm text-ink-medium">Bấm Nghe đoạn này để bắt đầu điền từ.</p>)}
    {session.mode === 'SPEAK' ? <fieldset disabled={locked} className="min-w-0 space-y-4"><p className="text-sm text-ink-medium">Nghe mẫu rồi ghi âm nói theo.</p><button disabled={locked} className="secondary-button" onClick={() => shadowingText ? setShadowingText('') : void act(async () => { const script = await api<{text:string}>(`/listening/sessions/${session.id}/shadowing-script`); setShadowingText(script.text); })}>{shadowingText ? 'Ẩn lời thoại' : 'Hiện lời thoại để shadowing'}</button>{shadowingText && <p className="whitespace-pre-wrap rounded-xl border border-paper-kraft bg-paper-cream p-4 text-base leading-relaxed">{shadowingText}</p>}<SpeakingRecorder maximumSeconds={session.settings.maxRecordingSeconds} onRecorded={() => setRecorded(true)} /></fieldset> : session.mode === 'DICTATION' ? <label className="block text-sm space-y-2"><span>Nghe rồi chép lại lời thoại của đoạn.</span><textarea aria-label="Câu trả lời Listening" value={answer} disabled={locked} onChange={event => updateDraft({ answer: event.target.value, blanks })} maxLength={3000} rows={3} className="form-input !border" /></label> : null}
    {pending && !busy && <p role="status" className="text-sm">Chưa xác nhận được lần gửi trước. Gửi lại cùng câu trả lời để nhận kết quả.</p>}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy || (!pending && (session.mode === 'SPEAK' ? !recorded : !submittedAnswer.trim()))} onClick={() => void act(submit)} className="primary-button">{busy && pending ? 'Đang gửi…' : pending ? 'Gửi lại câu trả lời' : session.mode === 'SPEAK' ? 'Hiện câu mẫu để đối chiếu' : 'Kiểm tra câu trả lời'}</button>
      <button disabled={busy} onClick={() => void act(async () => setHint((await api<{ hint: string }>(`/listening/sessions/${session.id}/hint`)).hint))} className="text-sm study-action-button">Gợi ý</button>
    </div>
    {hint && <p className="text-sm text-ink-medium">{hint}</p>}
    {feedback && <div role="status" className="rounded bg-paper-cream p-4 space-y-3">
      <p className="font-semibold">{feedback.selfReview ? 'Câu mẫu · tự đối chiếu' : `Mức khớp văn bản: ${Math.round(feedback.score * 100)}%`}</p>
      <p className="break-words text-base leading-relaxed">{feedback.expected}</p>
      {feedback.blankAnswers.length > 0 && <p className="text-sm">Từ còn thiếu: {feedback.blankAnswers.join(' · ')}</p>}
      <div className="flex flex-wrap gap-2">{feedback.words.map((word, index) => <span key={index} className={`rounded border px-2 py-1 text-sm ${word.kind === 'correct' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800'}`}>{word.kind === 'correct' ? word.actual : word.kind === 'missing' ? `Thiếu: ${word.expected}` : word.kind === 'extra' ? `Thừa: ${word.actual}` : `${word.kind === 'spelling' ? 'Chính tả' : 'Sai'}: ${word.actual} (mẫu: ${word.expected})`}</span>)}</div>
      <p className="text-xs text-ink-medium">{feedback.note}</p>
    </div>}
    <details className="text-xs text-ink-medium"><summary className="cursor-pointer">Quy tắc chấm văn bản</summary><p className="mt-2">Bỏ khác biệt chữ hoa, dấu câu và khoảng trắng. Chuẩn hóa các dạng thông dụng: don't = do not, I'm = I am, can't = cannot, won't = will not; it's được hiểu là it is. Không tự suy diễn dạng viết tắt mơ hồ như I'd. Lỗi chính tả là từ từ 4 ký tự trở lên lệch tối đa một ký tự. Đây không phải chẩn đoán lỗi nghe hay điểm phát âm.</p></details>
    <div className="flex justify-between border-t border-paper-kraft pt-3">
      <button disabled={locked || session.currentIndex === 0} className="secondary-button" onClick={() => void act(() => patch({ currentIndex: session.currentIndex - 1 }))}>Câu trước</button>
      <button disabled={locked || session.currentIndex + 1 >= session.totalUnits} className="secondary-button" onClick={() => void act(() => patch({ currentIndex: session.currentIndex + 1 }))}>Câu tiếp</button>
    </div>
  </section>;
}

export function ListeningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionParam = searchParams.get('session');
  const initialSessionId = sessionParam && /^[1-9]\d*$/.test(sessionParam) && Number.isSafeInteger(Number(sessionParam)) ? Number(sessionParam) : null;
  const sourceParam = searchParams.get('source');
  const requestedSource = sourceParam && /^[1-9]\d*$/.test(sourceParam) && Number.isSafeInteger(Number(sourceParam)) ? Number(sourceParam) : null;
  const restoreController = useRef<AbortController | null>(null);
  const { token, user } = useAuth(); let admin = false;
  try { admin = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'ADMIN'; } catch { /* Server guards remain authoritative. */ }
  const [catalogPage, setCatalogPage] = useState(1);
  const [savedPage, setSavedPage] = useState(1);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogKind, setCatalogKind] = useState('');
  const catalog = useAsyncResource(useCallback(async (signal: AbortSignal) => {
    const readPage = (page: number) => api<ListeningCatalog>("/listening?page=" + page + "&pageSize=8&search=" + encodeURIComponent(catalogQuery) + (catalogKind ? "&kind=" + catalogKind : ""), { signal });
    const result = await readPage(catalogPage);
    const lastPage = result.pagination?.totalPages;
    // Another device may remove the last page while this library stays open.
    // Resolve a valid page once; the same abort signal still guards both reads.
    return lastPage && catalogPage > lastPage ? readPage(lastPage) : result;
  }, [catalogPage, catalogQuery, catalogKind]));
  const catalogPages = catalog.data?.pagination?.totalPages ?? Math.ceil((catalog.data?.sources.length ?? 0) / 8);
  const currentCatalogPage = Math.min(catalog.data?.pagination?.page ?? catalogPage, Math.max(1, catalogPages));
  const visibleSources = catalog.data?.pagination ? catalog.data.sources : (catalog.data?.sources ?? []).slice((currentCatalogPage - 1) * 8, currentCatalogPage * 8);
  const savedSessions = catalog.data?.sessions ?? [];
  const savedPages = Math.max(1, Math.ceil(savedSessions.length / 8));
  const currentSavedPage = Math.min(savedPage, savedPages);
  const visibleSessions = savedSessions.slice((currentSavedPage - 1) * 8, currentSavedPage * 8);
  const [selectedId, setSelectedId] = useState<number | null>(null); const [session, setSession] = useState<ListeningSession | null>(null);
  const [addingVideo, setAddingVideo] = useState(false);
  const [browsingLibrary, setBrowsingLibrary] = useState(false);
  const videoInput = useRef<HTMLInputElement>(null);
  const videoTrigger = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (addingVideo) videoInput.current?.focus(); }, [addingVideo]);
  const [url, setUrl] = useState(''); const [start, setStart] = useState(0); const [end, setEnd] = useState(180);
  const [actionBusy, setBusy] = useState(false); const [capturing, setCapturing] = useState(false); const busy = actionBusy || capturing; const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const player = useRef<ListeningPlayerHandle>(null);
  const [restoreRevision, setRestoreRevision] = useState(0);
  const [settledRestoreKey, setSettledRestoreKey] = useState('');
  const restoreKey = initialSessionId ? `${initialSessionId}:${restoreRevision}` : '';
  const restoring = Boolean(restoreKey && settledRestoreKey !== restoreKey);
  const [removedId, setRemovedId] = useState<number | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const busyRef = useRef(false);
  const refreshedTranscript = useRef('');
  const captureOnPlayed = useRef<((position: number) => void) | null>(null);
  const [heardUnitId, setHeardUnitId] = useState<number | null>(null);
  useEffect(() => {
    if (!initialSessionId) return;
    const controller = new AbortController(); restoreController.current = controller;
    void api<ListeningSession>(`/listening/sessions/${initialSessionId}`, { signal: controller.signal }).then(next => {
      if (!controller.signal.aborted) { setSession(next); setSelectedId(next.sourceId); setStart(next.start); setEnd(next.end); }
    }).catch(cause => { if (!controller.signal.aborted) setError(getErrorMessage(cause)); }).finally(() => { if (!controller.signal.aborted) setSettledRestoreKey(restoreKey); });
    return () => controller.abort();
  }, [initialSessionId, restoreKey]);
  const defaultSegmentSeconds = catalog.data?.settings.defaultSegmentSeconds;
  useEffect(() => {
    if (initialSessionId || !requestedSource || defaultSegmentSeconds === undefined) return;
    const controller = new AbortController();
    const defaultEnd = defaultSegmentSeconds || 180;
    void api<SourceStatus>(`/listening/sources/${requestedSource}`, { signal: controller.signal }).then(() => {
      if (controller.signal.aborted) return;
      restoreController.current?.abort();
      setSelectedId(requestedSource); setSession(null);
      setStart(0); setEnd(defaultEnd); setNotice(''); setError(''); setAudioFile(null);
    }).catch(cause => { if (!controller.signal.aborted) setError(getErrorMessage(cause)); });
    return () => controller.abort();
  }, [initialSessionId, requestedSource, defaultSegmentSeconds, restoreRevision]);
  const status = useAsyncResource(useCallback((signal: AbortSignal) => selectedId ? api<SourceStatus>(`/listening/sources/${selectedId}${end > start ? `?start=${start}&end=${end}` : ''}`, { signal }) : Promise.resolve(null), [selectedId, start, end]));
  const source = session?.source || status.data?.source; const reloadStatus = status.reload;
  useEffect(() => { if (!['PENDING', 'PROCESSING'].includes(status.data?.transcript?.status || '')) return; const timer = window.setTimeout(reloadStatus, 2500); return () => clearTimeout(timer); }, [status.data, reloadStatus]);
  useEffect(() => {
    if (!session || session.unit || status.data?.transcript?.status !== 'READY') return;
    const key = `${session.id}-${status.data.transcript.id}`;
    if (refreshedTranscript.current === key) return;
    const controller = new AbortController();
    void api<ListeningSession>(`/listening/sessions/${session.id}`, { signal: controller.signal }).then(next => { if (!controller.signal.aborted) { refreshedTranscript.current = key; setSession(next); } }).catch(cause => { if (!controller.signal.aborted) setError(getErrorMessage(cause)); });
    return () => controller.abort();
  }, [session, status.data?.transcript?.id, status.data?.transcript?.status]);
  const act = async (action: () => Promise<void>) => { if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); try { await action(); } catch (cause) { setError(getErrorMessage(cause)); } finally { busyRef.current = false; setBusy(false); } };
  const select = (item: ListeningSource) => { setBrowsingLibrary(false); setAddingVideo(false); restoreController.current?.abort(); setSearchParams({}, { replace: true }); setSelectedId(item.id); setSession(null); setStart(0); setEnd(catalog.data?.settings.defaultSegmentSeconds || 180); setNotice(''); setAudioFile(null); };
  const resume = (id: number) => act(async () => { setBrowsingLibrary(false); restoreController.current?.abort(); const next = await api<ListeningSession>(`/listening/sessions/${id}`); setSession(next); setSearchParams({ session: String(next.id) }, { replace: true }); setSelectedId(next.sourceId); setStart(next.start); setEnd(next.end); });
  const startPractice = (mode: ListeningSession['mode']) => act(async () => {
    if (!source) return;
    const to = Math.min(status.data?.mediaDuration || end, catalog.data?.settings.maxSegmentSeconds || 300);
    if (status.data?.transcript?.status !== 'READY') await api(`/listening/sources/${source.id}/transcript`, {method:'POST',data:{start:0,end:to}});
    const created = await api<ListeningSession>('/listening/sessions', {method:'POST',data:{sourceId:source.id,start:0,end:to}});
    const next = await api<ListeningSession>(`/listening/sessions/${created.id}`, {method:'PATCH',data:{mode}});
    setSession(next); setStart(next.start); setEnd(next.end); setSearchParams({session:String(next.id)}, {replace:true});
    setNotice(next.unit ? 'Bài luyện đã sẵn sàng.' : 'Đang nhận dạng audio local. Bài luyện sẽ tự hiện khi hoàn tất.');
    status.reload(); catalog.reload();
  });
  return <div className={`page-stack prep-learning-page practice-studio listening-studio ${source || restoring || selectedId ? "prep-learning-study" : "prep-learning-library"}`}>
    <PageHeader variant="compact" title={source ? "Luyện nghe theo từng câu" : "Luyện nghe"} />
    {!source && !restoring && !selectedId && <ActivitySuggestions section="listening" compact />}
    <section aria-label="Chọn nguồn luyện nghe" className="study-mode-grid grid grid-cols-1 gap-3 sm:grid-cols-2">
      <button type="button" disabled={busy} aria-pressed={!addingVideo} onClick={() => { setAddingVideo(false); setBrowsingLibrary(true); }} className={`study-mode-card min-w-0 rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-navy sm:p-5 ${!addingVideo ? 'border-accent-navy bg-paper-sky' : 'border-paper-kraft bg-paper-white hover:bg-paper-cream'}`}><span className="block text-lg font-semibold">Bài nghe có sẵn</span><span className="mt-2 block text-sm leading-6 text-ink-medium">Chọn từ thư viện và luyện nghe theo từng câu.</span></button>
      <button ref={videoTrigger} type="button" disabled={busy} aria-expanded={addingVideo} aria-controls="listening-personal-video" onClick={() => setAddingVideo(true)} className={`study-mode-card min-w-0 rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-navy sm:p-5 ${addingVideo ? 'border-accent-navy bg-paper-sky' : 'border-paper-kraft bg-paper-white hover:bg-paper-cream'}`}><span className="block text-lg font-semibold">Thêm video của bạn</span><span className="mt-2 block text-sm leading-6 text-ink-medium">Dán link YouTube để tạo bài nghe riêng.</span></button>
    </section>
    <section hidden={!addingVideo} id="listening-personal-video" aria-label="Video YouTube cá nhân" className="rounded-xl border border-paper-kraft bg-paper-white p-4 sm:p-5 space-y-3"><h2 className="text-lg font-semibold">Thêm video YouTube của bạn</h2><form onSubmit={event => { event.preventDefault(); void act(async () => { const created = await api<ListeningSource>('/listening/sources', { method: 'POST', data: { title: 'YouTube cá nhân', kind: 'YOUTUBE', url } }); select(created); setUrl(''); catalog.reload(); }); }} className="space-y-3"><label className="block text-sm font-semibold" htmlFor="personal-video-url">Link YouTube</label><input ref={videoInput} id="personal-video-url" aria-label="Link YouTube" type="url" required disabled={busy} value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="form-input !border" /><p className="text-xs text-ink-medium">Video chỉ được lưu trong thư viện của bạn.</p><div className="flex flex-wrap gap-3"><button disabled={busy} className="primary-button">{busy ? 'Đang thêm video…' : 'Thêm video'}</button><button type="button" className="secondary-button" onClick={() => { setAddingVideo(false); videoTrigger.current?.focus(); }}>Đóng</button></div></form></section>
    {browsingLibrary && session && <button type="button" className="secondary-button self-start" onClick={() => setBrowsingLibrary(false)}>Tiếp tục bài đang luyện</button>}

    {(error || catalog.error || status.error) && <p role="alert" className="prep-learning-error rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error || catalog.error || status.error} <button onClick={() => { setError(''); setRestoreRevision(value => value + 1); catalog.reload(); status.reload(); }} className="study-action-button">Tải lại</button></p>}
    {initialSessionId && !session && !restoring && error && <button type="button" className="secondary-button self-start" onClick={() => { restoreController.current?.abort(); setSearchParams({}, { replace: true }); setSelectedId(null); setError(''); }}>Về thư viện bài nghe</button>}
    {notice && <p role="status" className="text-sm text-ink-medium">{notice} {removedId && <button disabled={busy} className="ml-2 study-action-button" onClick={() => void act(async () => { await api(`/listening/sources/${removedId}/restore`, { method: 'POST' }); setRemovedId(null); setNotice('Đã khôi phục bài nghe.'); catalog.reload(); })}>Hoàn tác xoá</button>}</p>}
    <div className="grid gap-5">
      {(source || restoring || selectedId) && <div hidden={browsingLibrary} className="min-w-0 space-y-5">
        {restoring || (selectedId && status.loading && !source) ? <p role="status" className="learning-surface">Đang mở bài nghe…</p> : source ? <>
          <div className={session ? "prep-study-layout" : "prep-study-preview"}>
          <section className="prep-listening-player min-w-0 space-y-4 bg-paper-white p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="min-w-0 break-words text-xl font-semibold">{source.title}</h2>{source.ownerId !== null && <button disabled={busy} className="text-sm text-rose-700 study-action-button" onClick={() => void act(async () => { await api(`/listening/sources/${source.id}`, { method: 'DELETE' }); restoreController.current?.abort(); setRemovedId(source.id); setSelectedId(null); setSession(null); setCatalogPage(1); setSearchParams({}, { replace: true }); setNotice('Đã xoá bài và các đoạn khỏi danh sách học.'); catalog.reload(); })}>Xoá bài</button>}</div><ListeningPlayer key={source.id} ref={player} source={source} onPlayed={() => { setHeardUnitId(session?.unit?.id || null); const position = player.current?.currentTime(); if (position !== null && position !== undefined) captureOnPlayed.current?.(position); }} />
            {!session && !status.loading && (status.data?.transcript?.status === 'READY' || (catalog.data?.asrAvailable && !!status.data?.practiceQuestions?.length)) && <div className="rounded-xl border border-paper-kraft bg-paper-cream p-4 space-y-3"><p className="font-semibold">Chọn cách luyện</p><div className="flex flex-wrap gap-2"><button disabled={busy} className="primary-button" onClick={() => void startPractice('DICTATION')}>Dictation · chép lời thoại</button><button disabled={busy} className="secondary-button" onClick={() => void startPractice('SPEAK')}>Shadowing · nói theo</button><button disabled={busy} className="secondary-button" onClick={() => void startPractice('CLOZE')}>Điền từ</button></div>{status.data?.transcript?.provider === 'santa-source-segment' ? <p className="text-xs text-ink-medium">Luyện toàn bộ audio với lời thoại đã lưu; chưa tách mốc từng câu.</p> : status.data?.transcript?.status !== 'READY' && <p className="text-xs text-ink-medium">Audio sẽ được nhận dạng trên máy local trước khi tạo câu luyện. Lần đầu có thể cần một lúc.</p>}</div>}
            <details open={!session} className="section-disclosure"><summary>Đoạn nghe và thiết lập</summary><ListeningRangeForm key={`${source.id}-${start}-${end}`} start={start} end={end} maximum={catalog.data?.settings.maxSegmentSeconds || 300} busy={busy} active={!!session} onApply={(nextStart, nextEnd) => void act(async () => { const next = await api<ListeningSession>('/listening/sessions', { method: 'POST', data: { sourceId: source.id, start: nextStart, end: nextEnd } }); setStart(nextStart); setEnd(nextEnd); setSession(next); setSearchParams({ session: String(next.id) }, { replace: true }); catalog.reload(); status.reload(); })} />
            <p className="text-xs text-ink-light">Mặc định {catalog.data?.settings.defaultSegmentSeconds || 180} giây; tối đa {catalog.data?.settings.maxSegmentSeconds || 300} giây mỗi phiên. Chỉ luyện câu nằm trọn trong đoạn đã chọn.</p></details>
            {status.data?.transcript?.status === 'READY' && <p className="text-xs text-ink-medium">Sẵn sàng luyện tập · {status.data.transcript.provider === 'youtube-auto' ? 'Phụ đề tự động' : status.data.transcript.provider === 'youtube-manual' ? 'Phụ đề của video' : ['local-whisper', 'local-audio'].includes(status.data.transcript.provider) ? 'Nhận dạng từ audio · có thể sai' : 'Lời thoại đã lưu'}{status.data.transcript.duration ? ` · mốc cuối ${time(status.data.transcript.duration)}` : ''}</p>}
            {['PENDING', 'PROCESSING'].includes(status.data?.transcript?.status || '') && <p role="status" className="text-sm">Đang chuẩn bị lời thoại… Bạn có thể nghe trong lúc chờ.</p>}
            {(!status.loading && (status.data?.transcript?.status === 'FAILED' || !status.data?.transcript)) && <div className="space-y-2 text-sm"><p>{status.data?.transcript?.error || (source.kind === 'AUDIO' ? 'Audio có thể nghe ngay. Nguồn này chưa có lời thoại theo thời gian nên chưa hỗ trợ điền từ hoặc chép chính tả.' : 'Chọn Chuẩn bị bài luyện để hệ thống lấy phụ đề hoặc nhận dạng audio cho đoạn này.')}</p>{source.kind === 'YOUTUBE' && <button disabled={busy} className="study-action-button disabled:opacity-40" onClick={() => void act(async () => { await api(`/listening/sources/${source.id}/transcript`, { method: 'POST', data: { start, end } }); status.reload(); })}>Tạo lời thoại cho đoạn này</button>}</div>}
            {!!status.data?.practiceQuestions?.length && <p className="rounded-lg bg-paper-cream p-3 text-sm text-ink-medium">Nguồn đề TOEIC · {status.data.practiceQuestions.length} câu hỏi liên quan · Part {[...new Set(status.data.practiceQuestions.map(question => question.part))].join(", ")}</p>}<div className="flex gap-4 text-xs"><MediaButton label="Nghe lại đoạn" onClick={() => player.current?.play(start, end)} /><button disabled={busy} className="study-action-button" onClick={() => void act(async () => { await api(`/listening/sources/${source.id}/reports`, { method: 'POST', data: { reason: 'Nguồn không phát được hoặc lời thoại không khớp.' } }); setNotice('Đã gửi báo lỗi nguồn học.'); })}>Báo lỗi nguồn</button></div>
          </section>
          {session && <div className="min-w-0 space-y-4"><div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span>Tiến độ tự lưu theo tài khoản</span><button disabled={busy} className="study-action-button" onClick={() => void act(async () => { setSession(await api<ListeningSession>(`/listening/sessions/${session.id}`, { method: 'PATCH', data: { favorite: !session.favorite } })); catalog.reload(); })}>{session.favorite ? 'Bỏ yêu thích' : 'Lưu yêu thích'}</button></div><Exercise key={`${user?.id}-${session.id}-${session.unit?.id}-${session.mode}-${session.difficulty}`} userId={user?.id ?? 0} session={session} heard={heardUnitId === session.unit?.id} play={(a, b) => player.current?.play(a, b)} change={next => { setSession(next); catalog.reload(); }} act={act} busy={busy} /></div>}
          </div>
          {source.ownerId !== null && catalog.data?.asrAvailable && status.data?.transcript?.status === 'FAILED' && <details className="section-disclosure"><summary>Tạo lời thoại khi YouTube chặn truy cập</summary><div className="space-y-4 text-sm"><ListeningAudioCapture key={source.id} seconds={end - start} onBusy={setCapturing} play={() => new Promise<number>((resolve, reject) => { const timeout = window.setTimeout(() => { captureOnPlayed.current = null; reject(new Error('Video chưa phát. Hãy bấm phát video trước rồi thử lại.')); }, 15000); captureOnPlayed.current = position => { clearTimeout(timeout); captureOnPlayed.current = null; resolve(position); }; player.current?.play(start, end, true); })} upload={async (file, capturedStart, capturedEnd) => { await apiUpload(`/listening/sources/${source.id}/audio`, file, { start: String(capturedStart), end: String(capturedEnd) }); setStart(capturedStart); setEnd(capturedEnd); setNotice('Đang nhận dạng âm thanh đã thu. Lời thoại vẫn được giữ ẩn.'); status.reload(); }} /><details><summary className="cursor-pointer study-action-button">Hoặc dùng file audio có sẵn</summary><div className="mt-3 space-y-3"><p>Chọn file audio của đúng đoạn {time(start)}–{time(end)} mà bạn có quyền sử dụng. Hệ thống nhận dạng và giữ lời thoại ẩn; bạn không cần nhập script. Tối đa 10 MB.</p><input aria-label="Audio để tạo lời thoại" disabled={busy} type="file" accept=".wav,.mp3,.m4a,.webm" onChange={event => setAudioFile(event.target.files?.[0] || null)} /><button disabled={busy || !audioFile} className="primary-button" onClick={() => void act(async () => { if (!audioFile) return; if (audioFile.size > 10_000_000) throw new Error('File audio tối đa 10 MB.'); await apiUpload(`/listening/sources/${source.id}/audio`, audioFile, { start: String(start), end: String(end) }); setAudioFile(null); status.reload(); setNotice('Đang tạo lời thoại từ audio. Bạn không cần đọc script trước.'); })}>Nhận dạng audio</button></div></details></div></details>}

        </> : null}
      </div>}
      <aside hidden={Boolean(source && !browsingLibrary)} className={`prep-library-layout listening-library-layout${source ? " prep-library-secondary" : ""}`} aria-label="Thư viện và đoạn nghe đã lưu">
        <section className="min-w-0 space-y-5"><div className="learning-section-heading"><div><h2 className="section-title">{source ? "Bài nghe khác" : "Thư viện bài nghe"}</h2></div><span className="learning-result-count">{catalog.data?.pagination?.total ?? catalog.data?.sources.length ?? 0} bài nghe</span></div><form className="prep-library-filters listening-library-filters" onSubmit={event => { event.preventDefault(); setCatalogPage(1); setCatalogQuery(catalogSearch.trim()); }}><input aria-label="Tìm bài nghe" type="search" value={catalogSearch} onChange={event => setCatalogSearch(event.target.value)} placeholder="Tìm theo tên bài nghe…" className="form-input !border min-w-0 flex-1" /><select aria-label="Loại nguồn bài nghe" className="form-input !border !w-auto" value={catalogKind} onChange={event => { setCatalogKind(event.target.value); setCatalogPage(1); }}><option value="">Mọi loại nguồn</option><option value="AUDIO">Audio</option><option value="YOUTUBE">YouTube</option><option value="VIDEO">Video</option></select><button className="secondary-button" type="submit">Tìm kiếm</button></form><div className="prep-library-catalog grid gap-5 sm:grid-cols-2">{catalog.loading && <p role="status" className="text-sm">Đang tải thư viện…</p>}{!catalog.loading && catalog.data?.sources.length === 0 && <p className="text-sm text-ink-medium">Không tìm thấy bài nghe phù hợp. Hãy đổi từ khóa hoặc chọn loại nguồn khác.</p>}{visibleSources.map(item => <button key={item.id} disabled={busy} onClick={() => select(item)} aria-pressed={selectedId === item.id} className={`prep-learning-card w-full text-left ${selectedId === item.id ? 'prep-learning-card-selected' : ''}`}><span className="learning-card-heading block break-words text-lg font-semibold">{item.title}</span><span className="learning-card-meta block text-sm text-ink-medium">{item.kind === 'YOUTUBE' ? 'YouTube' : item.kind === 'AUDIO' ? 'Audio' : 'Video'} · {item.ownerId === null ? 'Thư viện' : 'Riêng tư'}</span><span className="learning-card-action block border-t border-paper-kraft/60 text-sm font-semibold text-accent-navy">{selectedId === item.id ? 'Đang mở bài nghe' : 'Mở bài luyện'}</span></button>)}</div><Pagination page={currentCatalogPage} totalPages={catalogPages} onPageChange={setCatalogPage} label="Trang thư viện Listening" /></section>
        <div className="prep-learning-sidebar space-y-4"><div><h2 className="font-semibold">Góc học của bạn</h2></div><details open={!source} className="section-disclosure"><summary>Tiếp tục đoạn đã lưu</summary><div className="space-y-2">{!catalog.loading && catalog.data?.sessions.length === 0 && <p className="text-sm text-ink-medium">Chưa có đoạn đã lưu.</p>}{visibleSessions.map(item => <button key={item.id} disabled={busy} onClick={() => void resume(item.id)} className="block w-full border-b border-paper-kraft py-2 text-left text-sm"><span className="block">{item.source.title}{item.favorite ? ' · Yêu thích' : ''}</span><span className="text-xs text-ink-light">{time(item.start)}–{time(item.end)} · vị trí {item.currentIndex + 1}</span></button>)}</div><Pagination page={currentSavedPage} totalPages={savedPages} onPageChange={setSavedPage} label="Trang đoạn nghe đã lưu" /></details>
</div>
      </aside>
    </div>
    {admin && <ListeningAdmin onChanged={catalog.reload} />}
  </div>;
}

