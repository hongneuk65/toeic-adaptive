import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, apiUpload, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { useAuth } from '../auth/useAuth';
import { ListeningPlayer, type ListeningPlayerHandle } from '../components/listening/ListeningPlayer';
import { SpeakingRecorder } from '../components/listening/SpeakingRecorder';
import { ListeningAudioCapture } from '../components/listening/ListeningAudioCapture';
import { ListeningAdmin } from '../components/listening/ListeningAdmin';
import { PageHeader } from '../components/ui/PageHeader';
import type { ListeningCatalog, ListeningFeedback, ListeningSession, ListeningSource, SourceStatus } from '../types/listening';

function time(value: number) { return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`; }

function Exercise({ session, play, change, act, busy, heard }: { session: ListeningSession; play(start: number, end: number): void; change(value: ListeningSession): void; act(action: () => Promise<void>): Promise<void>; busy: boolean; heard: boolean }) {
  const [answer, setAnswer] = useState(''); const [feedback, setFeedback] = useState<ListeningFeedback | null>(session.feedback || null); const [hint, setHint] = useState(''); const [recorded, setRecorded] = useState(false);
  const unit = session.unit;
  if (!unit) return <p className="rounded border border-paper-kraft bg-paper-cream p-5 text-sm">Chưa có câu luyện trong đoạn này. Hệ thống sẽ cập nhật bài khi lời thoại sẵn sàng; bạn có thể nghe trong lúc chờ hoặc chọn đoạn khác.</p>;
  const patch = async (data: object) => change(await api<ListeningSession>(`/listening/sessions/${session.id}`, { method: 'PATCH', data }));
  const submit = async () => setFeedback(await api<ListeningFeedback>(`/listening/sessions/${session.id}/answers`, { method: 'POST', data: { unitId: unit.id, mode: session.mode, difficulty: session.difficulty, answer } }));
  return <section className="rounded border border-paper-kraft bg-paper-white p-5 space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold">Câu {session.currentIndex + 1} / {session.totalUnits} <span className="ml-2 text-sm font-normal text-ink-light">{time(unit.start)}–{time(unit.end)}</span></h2>
      <div className="flex flex-wrap gap-2">
        <select aria-label="Chế độ luyện" value={session.mode} disabled={busy} onChange={event => void act(() => patch({ mode: event.target.value }))} className="form-input !border !py-2">
          <option value="CLOZE">Điền từ thiếu</option><option value="DICTATION">Chép cả câu</option><option value="SPEAK">Nói lại · tự đối chiếu</option>
        </select>
        {session.mode === 'CLOZE' && <select aria-label="Mức độ bài luyện" value={session.difficulty} disabled={busy} onChange={event => void act(() => patch({ difficulty: event.target.value }))} className="rounded border border-paper-kraft p-2 text-sm"><option value="EASY">Dễ</option><option value="MEDIUM">Vừa</option><option value="HARD">Khó</option></select>}
      </div>
    </div>
    <button className="primary-button" onClick={() => play(unit.start, unit.end)}>Nghe câu này</button>
    <p className="text-xs text-ink-light">Lời thoại trong bài tập được ẩn trước khi trả lời. Phụ đề trong trình phát YouTube do YouTube quản lý.</p>
    {heard && session.mode === 'CLOZE' && <p className="text-lg leading-loose">{unit.tokens?.join(' ')}</p>}
    {session.mode === 'SPEAK' ? <SpeakingRecorder maximumSeconds={session.settings.maxRecordingSeconds} onRecorded={() => setRecorded(true)} /> : <label className="block text-sm space-y-2"><span>{session.mode === 'CLOZE' ? 'Nhập các từ còn thiếu theo thứ tự, cách nhau bằng dấu cách.' : 'Nghe rồi chép lại cả câu.'}</span><textarea aria-label="Câu trả lời Listening" value={answer} disabled={busy} onChange={event => setAnswer(event.target.value)} maxLength={3000} rows={3} className="form-input !border" /></label>}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy || (session.mode === 'SPEAK' ? !recorded : !answer.trim())} onClick={() => void act(submit)} className="primary-button">{session.mode === 'SPEAK' ? 'Hiện câu mẫu để đối chiếu' : 'Kiểm tra câu trả lời'}</button>
      <button disabled={busy} onClick={() => void act(async () => setHint((await api<{ hint: string }>(`/listening/sessions/${session.id}/hint`)).hint))} className="text-sm underline">Gợi ý</button>
    </div>
    {hint && <p className="text-sm text-ink-medium">{hint}</p>}
    {feedback && <div className="rounded bg-paper-cream p-4 space-y-3">
      <p className="font-semibold">{feedback.selfReview ? 'Câu mẫu · tự đối chiếu' : `Mức khớp văn bản: ${Math.round(feedback.score * 100)}%`}</p>
      <p className="text-base leading-relaxed">{feedback.expected}</p>
      {feedback.blankAnswers.length > 0 && <p className="text-sm">Từ còn thiếu: {feedback.blankAnswers.join(' · ')}</p>}
      <div className="flex flex-wrap gap-2">{feedback.words.map((word, index) => <span key={index} className={`rounded border px-2 py-1 text-sm ${word.kind === 'correct' ? 'border-emerald-200 text-emerald-800' : 'border-rose-200 text-rose-800'}`}>{word.kind === 'correct' ? word.actual : word.kind === 'missing' ? `Thiếu: ${word.expected}` : word.kind === 'extra' ? `Thừa: ${word.actual}` : `${word.kind === 'spelling' ? 'Chính tả' : 'Sai'}: ${word.actual} (mẫu: ${word.expected})`}</span>)}</div>
      <p className="text-xs text-ink-medium">{feedback.note}</p>
    </div>}
    <details className="text-xs text-ink-medium"><summary className="cursor-pointer">Quy tắc chấm văn bản</summary><p className="mt-2">Bỏ khác biệt chữ hoa, dấu câu và khoảng trắng. Chuẩn hóa các dạng thông dụng: don't = do not, I'm = I am, can't = cannot, won't = will not; it's được hiểu là it is. Không tự suy diễn dạng viết tắt mơ hồ như I'd. Lỗi chính tả là từ từ 4 ký tự trở lên lệch tối đa một ký tự. Đây không phải chẩn đoán lỗi nghe hay điểm phát âm.</p></details>
    <div className="flex justify-between border-t border-paper-kraft pt-3">
      <button disabled={busy || session.currentIndex === 0} className="text-sm disabled:opacity-40" onClick={() => void act(() => patch({ currentIndex: session.currentIndex - 1 }))}>Câu trước</button>
      <button disabled={busy || session.currentIndex + 1 >= session.totalUnits} className="text-sm disabled:opacity-40" onClick={() => void act(() => patch({ currentIndex: session.currentIndex + 1 }))}>Câu tiếp</button>
    </div>
  </section>;
}

export function ListeningPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [initialSessionId] = useState(() => Number(searchParams.get('session')) || null);
  const restoreController = useRef<AbortController | null>(null);
  const { token } = useAuth(); let admin = false;
  try { admin = JSON.parse(atob(token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'ADMIN'; } catch { /* Server guards remain authoritative. */ }
  const catalog = useAsyncResource(useCallback((signal: AbortSignal) => api<ListeningCatalog>('/listening', { signal }), []));
  const [selectedId, setSelectedId] = useState<number | null>(null); const [session, setSession] = useState<ListeningSession | null>(null);
  const [url, setUrl] = useState(''); const [start, setStart] = useState(0); const [end, setEnd] = useState(180);
  const [actionBusy, setBusy] = useState(false); const [capturing, setCapturing] = useState(false); const busy = actionBusy || capturing; const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const player = useRef<ListeningPlayerHandle>(null);
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
    }).catch(cause => { if (!controller.signal.aborted) setError(getErrorMessage(cause)); });
    return () => controller.abort();
  }, [initialSessionId]);
  const status = useAsyncResource(useCallback((signal: AbortSignal) => selectedId ? api<SourceStatus>(`/listening/sources/${selectedId}${end > start ? `?start=${start}&end=${end}` : ''}`, { signal }) : Promise.resolve(null), [selectedId, start, end]));
  const source = session?.source || status.data?.source; const reloadStatus = status.reload;
  useEffect(() => { if (!['PENDING', 'PROCESSING'].includes(status.data?.transcript?.status || '')) return; const timer = window.setTimeout(reloadStatus, 2500); return () => clearTimeout(timer); }, [status.data, reloadStatus]);
  useEffect(() => {
    if (!session || session.unit || status.data?.transcript?.status !== 'READY') return;
    const key = `${session.id}-${status.data.transcript.id}`;
    if (refreshedTranscript.current === key) return;
    refreshedTranscript.current = key;
    const controller = new AbortController();
    void api<ListeningSession>(`/listening/sessions/${session.id}`, { signal: controller.signal }).then(next => { if (!controller.signal.aborted) setSession(next); }).catch(cause => { if (!controller.signal.aborted) setError(getErrorMessage(cause)); });
    return () => controller.abort();
  }, [session, status.data?.transcript?.id, status.data?.transcript?.status]);
  const act = async (action: () => Promise<void>) => { if (busyRef.current) return; busyRef.current = true; setBusy(true); setError(''); try { await action(); } catch (cause) { setError(getErrorMessage(cause)); } finally { busyRef.current = false; setBusy(false); } };
  const select = (item: ListeningSource) => { restoreController.current?.abort(); setSearchParams({}, { replace: true }); setSelectedId(item.id); setSession(null); setStart(0); setEnd(catalog.data?.settings.defaultSegmentSeconds || 180); setNotice(''); setAudioFile(null); };
  const resume = (id: number) => act(async () => { restoreController.current?.abort(); const next = await api<ListeningSession>(`/listening/sessions/${id}`); setSession(next); setSearchParams({ session: String(next.id) }, { replace: true }); setSelectedId(next.sourceId); setStart(next.start); setEnd(next.end); });
  return <div className="space-y-6">
    <PageHeader title="Luyện nghe theo từng đoạn" description="Chọn bài có sẵn hoặc lưu một video YouTube của riêng bạn." />
    {(error || catalog.error || status.error) && <p role="alert" className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error || catalog.error || status.error} <button onClick={() => { catalog.reload(); status.reload(); }} className="underline">Tải lại</button></p>}
    {notice && <p role="status" className="text-sm text-ink-medium">{notice} {removedId && <button disabled={busy} className="ml-2 underline" onClick={() => void act(async () => { await api(`/listening/sources/${removedId}/restore`, { method: 'POST' }); setRemovedId(null); setNotice('Đã khôi phục bài nghe.'); catalog.reload(); })}>Hoàn tác xoá</button>}</p>}
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="order-2 space-y-4 lg:order-1">
        <form onSubmit={event => { event.preventDefault(); void act(async () => { const created = await api<ListeningSource>('/listening/sources', { method: 'POST', data: { title: 'YouTube cá nhân', kind: 'YOUTUBE', url } }); select(created); setUrl(''); catalog.reload(); }); }} className="space-y-3 rounded border border-paper-kraft bg-paper-white p-4">
          <h2 className="font-semibold">YouTube của bạn</h2><input aria-label="Link YouTube" type="url" required value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="form-input !border" /><p className="text-xs text-ink-light">Video chỉ được lưu trong thư viện của bạn.</p><button disabled={busy} className="primary-button w-full">Thêm video</button>
        </form>
        <details open={!selectedId} className="section-disclosure"><summary>Thư viện bài nghe</summary><div className="max-h-80 overflow-y-auto space-y-2">{catalog.loading && <p className="text-sm">Đang tải...</p>}{catalog.data?.sources.map(item => <button key={item.id} disabled={busy} onClick={() => select(item)} className={`w-full rounded border p-3 text-left ${selectedId === item.id ? 'border-accent-navy bg-paper-cream' : 'border-paper-kraft bg-paper-white'}`}><span className="block text-sm font-semibold">{item.title}</span><span className="text-xs text-ink-light">{item.kind === 'YOUTUBE' ? 'YouTube' : item.kind === 'AUDIO' ? 'Audio' : 'Video'} · {item.ownerId === null ? 'Thư viện' : 'Riêng tư'}</span></button>)}</div></details>
        <details className="section-disclosure"><summary>Đoạn đã lưu</summary><div className="max-h-64 overflow-y-auto space-y-2">{catalog.data?.sessions.map(item => <button key={item.id} disabled={busy} onClick={() => void resume(item.id)} className="block w-full border-b border-paper-kraft py-2 text-left text-sm"><span className="block">{item.source.title}{item.favorite ? ' · Yêu thích' : ''}</span><span className="text-xs text-ink-light">{time(item.start)}–{time(item.end)} · vị trí {item.currentIndex + 1}</span></button>)}</div></details>
      </aside>
      <div className="order-1 min-w-0 space-y-5 lg:order-2">
        {source ? <>
          <section className="rounded border border-paper-kraft bg-paper-white p-5 space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{source.title}</h2>{source.ownerId !== null && <button disabled={busy} className="text-sm text-rose-700 underline" onClick={() => void act(async () => { await api(`/listening/sources/${source.id}`, { method: 'DELETE' }); restoreController.current?.abort(); setRemovedId(source.id); setSelectedId(null); setSession(null); setSearchParams({}, { replace: true }); setNotice('Đã xoá bài và các đoạn khỏi danh sách học.'); catalog.reload(); })}>Xoá bài</button>}</div><ListeningPlayer key={source.id} ref={player} source={source} onPlayed={() => { setHeardUnitId(session?.unit?.id || null); const position = player.current?.currentTime(); if (position !== null && position !== undefined) captureOnPlayed.current?.(position); }} />
            <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Bắt đầu (giây)<input type="number" aria-label="Bắt đầu đoạn" disabled={busy} min="0" max="86400" value={start} onChange={event => setStart(Number(event.target.value))} className="form-input !border w-28" /></label><label className="text-sm">Kết thúc (giây)<input type="number" aria-label="Kết thúc đoạn" disabled={busy} min="1" max="86400" value={end} onChange={event => setEnd(Number(event.target.value))} className="form-input !border w-28" /></label><button disabled={busy} className="primary-button" onClick={() => void act(async () => { const next = await api<ListeningSession>('/listening/sessions', { method: 'POST', data: { sourceId: source.id, start, end } }); setSession(next); setSearchParams({ session: String(next.id) }, { replace: true }); catalog.reload(); status.reload(); })}>{status.data?.transcript?.status === 'READY' ? 'Bắt đầu luyện đoạn này' : 'Chuẩn bị bài luyện'}</button></div>
            <p className="text-xs text-ink-light">Mặc định {catalog.data?.settings.defaultSegmentSeconds || 180} giây; tối đa {catalog.data?.settings.maxSegmentSeconds || 300} giây mỗi phiên. Chỉ luyện câu nằm trọn trong đoạn đã chọn.</p>
            {status.data?.transcript?.status === 'READY' && <p className="text-xs text-ink-medium">Sẵn sàng luyện tập · {status.data.transcript.provider === 'youtube-auto' ? 'Phụ đề tự động' : status.data.transcript.provider === 'youtube-manual' ? 'Phụ đề của video' : ['local-whisper', 'local-audio'].includes(status.data.transcript.provider) ? 'Nhận dạng từ audio · có thể sai' : 'Lời thoại đã lưu'}{status.data.transcript.duration ? ` · mốc cuối ${time(status.data.transcript.duration)}` : ''}</p>}
            {['PENDING', 'PROCESSING'].includes(status.data?.transcript?.status || '') && <p role="status" className="text-sm">Đang chuẩn bị lời thoại… Nếu không lấy được CC, hệ thống nhận dạng từ audio. Có thể mất vài phút; bạn có thể nghe trong lúc chờ.</p>}
            {(!status.loading && (status.data?.transcript?.status === 'FAILED' || !status.data?.transcript)) && <div className="space-y-2 text-sm"><p>{status.data?.transcript?.error || 'Chọn Chuẩn bị bài luyện để hệ thống lấy phụ đề hoặc nhận dạng audio cho đoạn này.'}</p>{source.kind === 'YOUTUBE' && <button disabled={busy || (status.data?.transcript?.attempts || 0) >= 3} className="underline disabled:opacity-40" onClick={() => void act(async () => { await api(`/listening/sources/${source.id}/transcript`, { method: 'POST', data: { start, end } }); status.reload(); })}>Tạo lời thoại cho đoạn này</button>}</div>}
            <div className="flex gap-4 text-xs"><button onClick={() => player.current?.play(start, end)} className="underline">Nghe lại đoạn</button><button disabled={busy} className="underline" onClick={() => void act(async () => { await api(`/listening/sources/${source.id}/reports`, { method: 'POST', data: { reason: 'Nguồn không phát được hoặc lời thoại không khớp.' } }); setNotice('Đã gửi báo lỗi nguồn học.'); })}>Báo lỗi nguồn</button></div>
          </section>
          {source.ownerId !== null && catalog.data?.asrAvailable && status.data?.transcript?.status === 'FAILED' && <details className="section-disclosure"><summary>Tạo lời thoại khi YouTube chặn truy cập</summary><div className="space-y-4 text-sm"><ListeningAudioCapture key={source.id} seconds={end - start} onBusy={setCapturing} play={() => new Promise<number>((resolve, reject) => { const timeout = window.setTimeout(() => { captureOnPlayed.current = null; reject(new Error('Video chưa phát. Hãy bấm phát video trước rồi thử lại.')); }, 15000); captureOnPlayed.current = position => { clearTimeout(timeout); captureOnPlayed.current = null; resolve(position); }; player.current?.play(start, end, true); })} upload={async (file, capturedStart, capturedEnd) => { await apiUpload(`/listening/sources/${source.id}/audio`, file, { start: String(capturedStart), end: String(capturedEnd) }); setStart(capturedStart); setEnd(capturedEnd); setNotice('Đang nhận dạng âm thanh đã thu. Lời thoại vẫn được giữ ẩn.'); status.reload(); }} /><details><summary className="cursor-pointer underline">Hoặc dùng file audio có sẵn</summary><div className="mt-3 space-y-3"><p>Chọn file audio của đúng đoạn {time(start)}–{time(end)} mà bạn có quyền sử dụng. Hệ thống nhận dạng và giữ lời thoại ẩn; bạn không cần nhập script. Tối đa 10 MB.</p><input aria-label="Audio để tạo lời thoại" disabled={busy} type="file" accept=".wav,.mp3,.m4a,.webm" onChange={event => setAudioFile(event.target.files?.[0] || null)} /><button disabled={busy || !audioFile} className="primary-button" onClick={() => void act(async () => { if (!audioFile) return; if (audioFile.size > 10_000_000) throw new Error('File audio tối đa 10 MB.'); await apiUpload(`/listening/sources/${source.id}/audio`, audioFile, { start: String(start), end: String(end) }); setAudioFile(null); status.reload(); setNotice('Đang tạo lời thoại từ audio. Bạn không cần đọc script trước.'); })}>Nhận dạng audio</button></div></details></div></details>}
          {session && <><div className="flex items-center justify-between text-sm"><span>Tiến độ tự lưu theo tài khoản</span><button disabled={busy} className="underline" onClick={() => void act(async () => { setSession(await api<ListeningSession>(`/listening/sessions/${session.id}`, { method: 'PATCH', data: { favorite: !session.favorite } })); catalog.reload(); })}>{session.favorite ? 'Bỏ yêu thích' : 'Lưu yêu thích'}</button></div><Exercise key={`${session.id}-${session.unit?.id}-${session.mode}-${session.difficulty}`} session={session} heard={heardUnitId === session.unit?.id} play={(a, b) => player.current?.play(a, b)} change={next => { setSession(next); catalog.reload(); }} act={act} busy={busy} /></>}
        </> : <p className="rounded border border-paper-kraft bg-paper-white p-8 text-ink-medium">Chọn bài mẫu trong thư viện để bắt đầu, hoặc thêm một link YouTube.</p>}
      </div>
    </div>
    {admin && <ListeningAdmin onChanged={catalog.reload} />}
  </div>;
}
