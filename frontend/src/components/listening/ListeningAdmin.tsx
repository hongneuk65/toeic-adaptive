import { useCallback, useMemo, useRef, useState } from 'react';
import { api, apiUpload, getErrorMessage } from '../../lib/api';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { ListeningSettings, ListeningSource } from '../../types/listening';
import { ListeningPlayer } from './ListeningPlayer';

interface AdminOverview { sources: ListeningSource[]; reports: { id: number; reason: string; source: { title: string } }[]; failed: { id: number; sourceId: number; error: string; attempts: number }[]; settings: ListeningSettings }
export function ListeningAdmin({ onChanged }: { onChanged(): void }) {
  const resource = useAsyncResource(useCallback((signal: AbortSignal) => api<AdminOverview>('/listening/admin', { signal }), []));
  const audio = useAsyncResource(useCallback((signal: AbortSignal) => api<{ id: number; audioUrl: string }[]>('/listening/admin/system-audio', { signal }), []));
  const [title, setTitle] = useState(''); const [url, setUrl] = useState(''); const [kind, setKind] = useState('AUDIO'); const [subtitle, setSubtitle] = useState(''); const [targetId, setTargetId] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const [notice, setNotice] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourcePage, setSourcePage] = useState(1);
  const [audioSearch, setAudioSearch] = useState('');
  const filteredSources = useMemo(() => {
    const query = sourceSearch.trim().toLocaleLowerCase('vi-VN');
    return (resource.data?.sources || []).filter(source => !query || `${source.id} ${source.title}`.toLocaleLowerCase('vi-VN').includes(query));
  }, [resource.data?.sources, sourceSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredSources.length / 20));
  const currentPage = Math.min(sourcePage, totalPages);
  const pageSources = filteredSources.slice((currentPage - 1) * 20, currentPage * 20);
  const uniqueAudio = useMemo(() => [...new Map((audio.data || []).filter(item => item.audioUrl).map(item => [item.audioUrl, item])).values()], [audio.data]);
  const audioMatches = useMemo(() => {
    const query = audioSearch.trim().toLowerCase();
    return [...new Map((audio.data || []).filter(item => item.audioUrl && (!query || `${item.id} ${item.audioUrl}`.toLowerCase().includes(query))).map(item => [item.audioUrl, item])).values()];
  }, [audio.data, audioSearch]);
  const selectedAudio = uniqueAudio.find(item => item.audioUrl === url);
  const audioOptions = audioMatches.slice(0, 50);
  if (selectedAudio && !audioOptions.some(item => item.audioUrl === selectedAudio.audioUrl)) { audioOptions.unshift(selectedAudio); if (audioOptions.length > 50) audioOptions.pop(); }
  const selectedSource = resource.data?.sources.find(source => String(source.id) === targetId);
  const sourceOptions = selectedSource && !pageSources.some(source => source.id===selectedSource.id) ? [selectedSource, ...pageSources] : pageSources;
  const previewSource = (() => {
    if (!url.trim()) return selectedSource;
    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.protocol !== 'https:' && parsed.origin !== window.location.origin) return;
      const youtubeHost = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(parsed.hostname);
      const videoId = parsed.hostname === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.split('/').pop();
      if (kind === 'YOUTUBE' && (!youtubeHost || !videoId || !/^[\w-]{11}$/.test(videoId))) return;
      return { id: 0, title: title || 'Xem trước', kind: kind as ListeningSource['kind'], url: parsed.href, videoId: kind === 'YOUTUBE' ? videoId! : null, ownerId: null, published: false };
    } catch { return; }
  })();
  const run = async (action: () => Promise<void>) => { if(actionLock.current) return;actionLock.current=true;setBusy(true); setError(''); setNotice(''); try { await action(); resource.reload(); onChanged(); setNotice('Đã hoàn tất thao tác.'); } catch (cause) { setError(getErrorMessage(cause)); } finally { actionLock.current=false;setBusy(false); } };
  return <details open className="section-disclosure"><summary>Quản lý Listening · Admin</summary><div className="space-y-6 text-sm">
    {(error || resource.error) && <p role="alert" className="text-rose-800">{error || resource.error}</p>}
    {resource.loading && <p role="status">Đang tải nguồn nghe…</p>}
    {resource.error && <button className="secondary-button" onClick={resource.reload}>Tải lại nguồn nghe</button>}
    {audio.error && <p role="alert">Chưa tải được danh sách audio hệ thống. <button className="underline" onClick={audio.reload}>Thử lại</button></p>}
    {notice && <p role="status" className="text-ink-medium">{notice}</p>}
    <fieldset disabled={busy} className="admin-editor-fields">
    <form className="grid gap-3 md:grid-cols-2" onSubmit={event => { event.preventDefault(); void run(async () => { const source = await api<ListeningSource>('/listening/admin/sources', { method: 'POST', data: { title, url, kind, published: false } }); setTargetId(String(source.id)); setTitle(''); setUrl(''); }); }}>
      <label>Tên nguồn<input className="form-input !border" aria-label="Tên nguồn công khai" placeholder="Tên nguồn học" required value={title} onChange={event => setTitle(event.target.value)} maxLength={200} /></label>
      <label>Loại nguồn<select aria-label="Loại nguồn Listening" className="form-input !border" value={kind} onChange={event => setKind(event.target.value)}><option value="AUDIO">Audio</option><option value="VIDEO">Video</option><option value="YOUTUBE">YouTube</option></select></label>
      <label>Đường dẫn media<input className="form-input !border" aria-label="URL nguồn Listening" placeholder="URL HTTPS hoặc file đã upload" required value={url} onChange={event => setUrl(event.target.value)} /></label>
      <div className="space-y-2"><label>Tìm audio hệ thống<input type="search" className="form-input !border" value={audioSearch} onChange={event => setAudioSearch(event.target.value)} placeholder="Mã câu hỏi hoặc đường dẫn audio…" /></label><label>Audio trong hệ thống<select aria-label="Audio có sẵn của hệ thống" className="form-input !border" value={selectedAudio ? url : ''} onChange={event => { if(event.target.value) { setUrl(event.target.value); setKind('AUDIO'); } }}><option value="">Chọn audio câu hỏi có sẵn</option>{audioOptions.map(item => <option key={item.audioUrl} value={item.audioUrl}>Câu hỏi #{item.id} · {item.audioUrl}</option>)}</select></label><p className="text-xs text-ink-medium">{audioMatches.length} audio phù hợp · hiển thị tối đa 50 kết quả. Tìm mã câu hoặc đường dẫn để thu hẹp.</p></div>
      <label className="space-y-2">Upload media công khai · tối đa 20 MB<input type="file" accept="audio/mpeg,audio/wav,video/mp4,video/webm" disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (!file) return; void run(async () => { if (file.size > 20 * 1024 * 1024) throw new Error('File vượt 20 MB.'); const value = await apiUpload<{ url: string; kind: string }>('/listening/admin/media', file); setUrl(value.url); setKind(value.kind); }); }} /></label>
      <button disabled={busy} className="primary-button">Tạo nguồn nháp</button>
    </form>
    </fieldset>
    {previewSource && <details className="section-disclosure"><summary>Xem trước nguồn nghe</summary><ListeningPlayer key={`${previewSource.kind}:${previewSource.url}`} source={previewSource} ref={null} onPlayed={() => {}} /></details>}
    <section className="space-y-3"><h3 className="font-semibold">Nguồn công khai <span className="admin-count">{resource.data?.sources.length ?? 0}</span></h3><label>Tìm nguồn theo tên hoặc ID<input type="search" className="form-input !border" value={sourceSearch} onChange={event => {setSourceSearch(event.target.value);setSourcePage(1);}} placeholder="Tên nguồn nghe hoặc ID…" /></label><p role="status" className="text-xs text-ink-medium">{filteredSources.length} nguồn phù hợp · 20 nguồn mỗi trang</p>{!resource.loading && filteredSources.length===0 && !!sourceSearch && <p className="admin-inline-empty">Không có nguồn khớp tìm kiếm.</p>}{!resource.loading && resource.data?.sources.length===0 && <p className="admin-inline-empty">Chưa có nguồn công khai. Tạo nguồn nháp và thêm phụ đề trước khi xuất bản.</p>}{pageSources.map(source => <div key={source.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-kraft pb-2"><span>{source.title} · {source.published ? 'Đã xuất bản' : 'Bản nháp'}</span><div className="flex gap-3"><button disabled={busy} className="underline" onClick={() => {if(subtitle.trim() && !window.confirm("Bỏ phụ đề chưa lưu để chuyển nguồn?")) return;setSubtitle("");setTargetId(String(source.id));}}>Nhập phụ đề</button><button disabled={busy} className="underline" onClick={() => void run(async () => { await api(`/listening/admin/sources/${source.id}`, { method: 'PATCH', data: { published: !source.published } }); })}>{source.published ? 'Ẩn bài' : 'Xuất bản'}</button></div></div>)}{totalPages>1 && <nav aria-label="Trang nguồn nghe quản trị" className="flex items-center justify-between gap-3"><button className="secondary-button" disabled={busy || currentPage<=1} onClick={() => setSourcePage(currentPage-1)}>Trang trước</button><span className="text-xs text-ink-medium">Trang {currentPage} / {totalPages}</span><button className="secondary-button" disabled={busy || currentPage>=totalPages} onClick={() => setSourcePage(currentPage+1)}>Trang tiếp</button></nav>}</section>
    <div className="space-y-3"><label>Nhập SRT/VTT cho nguồn<select aria-label="Nguồn nhận phụ đề" className="form-input !border" value={targetId} disabled={busy} onChange={event => {if(subtitle.trim() && !window.confirm("Bỏ phụ đề chưa lưu để chuyển nguồn?")) return;setSubtitle("");setTargetId(event.target.value);}}><option value="">Chọn nguồn trong trang hiện tại</option>{sourceOptions.map(source => <option key={source.id} value={source.id}>{source.title}</option>)}</select><span className="text-xs font-normal text-ink-medium">Tìm tên hoặc ID trong danh sách nguồn phía trên; nguồn đang chọn luôn được giữ.</span></label><input disabled={busy || !targetId} aria-label="Phụ đề nguồn công khai" type="file" accept=".srt,.vtt" onChange={event => { const file = event.target.files?.[0]; if (file) void run(async () => { if (file.size > (resource.data?.settings.maxSubtitleBytes || 200000)) throw new Error('File phụ đề quá lớn.'); setSubtitle(await file.text()); }); }} /><textarea className="form-input !border" disabled={busy || !targetId} aria-label="Nội dung SRT/VTT admin" rows={5} value={subtitle} onChange={event => setSubtitle(event.target.value)} maxLength={200000} /><button disabled={busy || !targetId || !subtitle.trim()} className="primary-button" onClick={() => void run(async () => { await api(`/listening/admin/sources/${targetId}/subtitles`, { method: 'POST', data: { text: subtitle, format: 'SUBTITLES' } }); setSubtitle(''); })}>Lưu phụ đề</button></div>
    <details className="section-disclosure"><summary>Báo lỗi và thiết lập nâng cao</summary><div className="space-y-5"><section className="space-y-2"><h3 className="font-semibold">Báo lỗi chưa xử lý</h3>{resource.data?.reports.length === 0 && <p>Không có báo lỗi.</p>}{resource.data?.reports.map(report => <div key={report.id} className="flex justify-between gap-3"><span>{report.source.title}: {report.reason}</span><button disabled={busy} className="underline" onClick={() => void run(async () => { await api(`/listening/admin/reports/${report.id}`, { method: 'PATCH' }); })}>Đã xử lý</button></div>)}</section>
    <section className="space-y-2"><h3 className="font-semibold">Tác vụ transcript thất bại</h3>{resource.data?.failed.length === 0 && <p>Không có tác vụ thất bại.</p>}{resource.data?.failed.map(job => <div key={job.id} className="space-y-1 border-b py-2"><p>Nguồn #{job.sourceId} · {job.error}</p><button disabled={busy} className="underline disabled:opacity-40" onClick={() => void run(async () => { await api(`/listening/admin/sources/${job.sourceId}/transcript`, { method: 'POST' }); })}>Thử lại</button></div>)}</section>
    {resource.data && <form key={JSON.stringify(resource.data.settings)} className="grid gap-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); const values = Object.fromEntries([...new FormData(event.currentTarget)].map(([key, value]) => [key, Number(value)])); void run(async () => { await api('/listening/admin/settings', { method: 'PATCH', data: values }); }); }}><h3 className="font-semibold sm:col-span-2">Giới hạn tài nguyên</h3>{([
      ['maxSegmentSeconds', 'Đoạn tối đa (giây)', 30, 300], ['defaultSegmentSeconds', 'Đoạn mặc định (giây)', 30, 180], ['transcriptTtlHours', 'Cache YouTube (giờ)', 1, 168], ['requestsPerHour', 'Yêu cầu nguồn/phụ đề mỗi giờ', 1, 60], ['maxSubtitleBytes', 'Dung lượng phụ đề (byte)', 1024, 200000], ['maxRecordingSeconds', 'Ghi âm tối đa (giây)', 10, 120],
    ] as const).map(([key, label, min, max]) => <label key={key}>{label}<input disabled={busy} className="form-input !border" type="number" required name={key} min={min} max={max} defaultValue={resource.data!.settings[key]} /></label>)}<button disabled={busy} className="primary-button">Lưu giới hạn</button></form>}
  </div></details></div></details>;
}
