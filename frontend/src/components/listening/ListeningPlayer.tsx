import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { ListeningSource } from '../../types/listening';

interface YoutubePlayer {
  seekTo(time: number, allow: boolean): void; playVideo(): void; pauseVideo(): void;
  getCurrentTime(): number; setPlaybackRate(rate: number): void; getAvailablePlaybackRates(): number[]; destroy(): void;
}
interface YoutubeApi { Player: new (element: HTMLElement, config: { videoId: string; playerVars: Record<string, string | number>; events: { onReady(): void; onError(event: { data: number }): void; onStateChange(event: { data: number }): void } }) => YoutubePlayer }
declare global { interface Window { YT?: YoutubeApi; onYouTubeIframeAPIReady?: () => void } }
let youtubeReady: Promise<YoutubeApi> | undefined;
function loadYoutube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youtubeReady ??= new Promise<YoutubeApi>((resolve, reject) => {
    const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; script.async = true;
    const timeout = window.setTimeout(() => { youtubeReady = undefined; reject(new Error('Không tải được trình phát YouTube. Kiểm tra kết nối hoặc mở video trên YouTube.')); }, 15000);
    window.onYouTubeIframeAPIReady = () => { clearTimeout(timeout); if (window.YT) resolve(window.YT); };
    script.onerror = () => { clearTimeout(timeout); youtubeReady = undefined; script.remove(); reject(new Error('Không tải được trình phát YouTube.')); };
    document.head.appendChild(script);
  });
  return youtubeReady;
}
export interface ListeningPlayerHandle { play(start: number, end: number, originalSpeed?: boolean): void; currentTime(): number | null }
export function ListeningPlayer({ source, ref, onPlayed }: { source: ListeningSource; ref: Ref<ListeningPlayerHandle>; onPlayed(): void }) {
  const host = useRef<HTMLDivElement>(null); const media = useRef<HTMLMediaElement>(null); const player = useRef<YoutubePlayer | null>(null);
  const stopAt = useRef<number | null>(null); const [error, setError] = useState(''); const [rates, setRates] = useState([1]); const [ready, setReady] = useState(false);
  const [selectedRate, setSelectedRate] = useState(1);
  const playedCallback = useRef(onPlayed);
  useEffect(() => { playedCallback.current = onPlayed; }, [onPlayed]);
  useEffect(() => {
    if (source.kind !== 'YOUTUBE') return;
    let active = true; let loaded = false; let instance: YoutubePlayer | undefined;
    void loadYoutube().then(api => {
      if (!active || !host.current) return;
      const element = document.createElement('div'); host.current.appendChild(element);
      instance = new api.Player(element, { videoId: source.videoId!, playerVars: { origin: window.location.origin, playsinline: 1 }, events: {
        onReady: () => { if (active) { loaded = true; setReady(true); setRates(instance?.getAvailablePlaybackRates() || [1]); } },
        onStateChange: event => { if (active && event.data === 1) playedCallback.current(); },
        onError: event => { if (active) setError([101, 150].includes(event.data) ? 'Video không cho phép nhúng. Hãy mở trên YouTube hoặc chọn nguồn khác.' : `YouTube không phát được video (mã ${event.data}). Video có thể riêng tư, bị xóa hoặc yêu cầu xác minh.`); },
      } }); player.current = instance;
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Không tải được YouTube.'); });
    const timer = window.setInterval(() => { if (loaded && stopAt.current !== null && player.current && player.current.getCurrentTime() >= stopAt.current) { player.current.pauseVideo(); stopAt.current = null; } }, 150);
    return () => { active = false; clearInterval(timer); instance?.destroy(); player.current = null; };
  }, [source.kind, source.videoId]);
  useImperativeHandle(ref, () => ({ play(start, end, originalSpeed) {
    stopAt.current = end;
    if (originalSpeed) setSelectedRate(1);
    if (source.kind === 'YOUTUBE') { if (!ready || !player.current) { setError('Trình phát đang tải, vui lòng thử lại.'); return; } if (originalSpeed) { player.current.pauseVideo(); player.current.setPlaybackRate(1); } player.current.seekTo(start, true); player.current.playVideo(); }
    else if (media.current) { if (originalSpeed) media.current.playbackRate = 1; media.current.currentTime = start; void media.current.play().catch(() => setError('Không phát được media. Kiểm tra đường dẫn hoặc bấm Phát trong trình phát.')); }
  }, currentTime() { return source.kind === 'YOUTUBE' ? ready ? player.current?.getCurrentTime() ?? null : null : media.current?.currentTime ?? null; } }), [ready, source.kind]);
  const mediaEvents = { onCanPlay: () => { setReady(true); setRates([.5, .75, 1, 1.25, 1.5]); }, onPlay: onPlayed, onError: () => setError('Không tải được audio/video. Hãy báo lỗi nguồn hoặc chọn bài mẫu.'), onTimeUpdate: () => { if (media.current && stopAt.current !== null && media.current.currentTime >= stopAt.current) { media.current.pause(); stopAt.current = null; } } };
  return <div className="space-y-3">
    {source.kind === 'YOUTUBE' ? <div ref={host} className="listening-youtube" /> : source.kind === 'VIDEO' ? <video ref={media as Ref<HTMLVideoElement>} src={source.url} controls preload="metadata" className="w-full rounded" {...mediaEvents} /> : <audio ref={media as Ref<HTMLAudioElement>} src={source.url} controls preload="metadata" className="w-full" {...mediaEvents} />}
    <label className="flex items-center gap-2 text-sm text-ink-medium">Tốc độ phát <select aria-label="Tốc độ phát" disabled={!ready} value={selectedRate} onChange={event => { const rate = Number(event.target.value); setSelectedRate(rate); if (source.kind === 'YOUTUBE') player.current?.setPlaybackRate(rate); else if (media.current) media.current.playbackRate = rate; }} className="rounded border border-paper-kraft p-1">{rates.map(rate => <option key={rate} value={rate}>{rate}x</option>)}</select></label>
    {error && <p role="alert" className="text-sm text-rose-800">{error} {source.kind === 'YOUTUBE' && <a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">Mở trên YouTube</a>}</p>}
  </div>;
}
