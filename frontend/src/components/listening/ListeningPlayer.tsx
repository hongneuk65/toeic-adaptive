import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import type { ListeningSource } from '../../types/listening';
import { playbackStart as getPlaybackStart, seekReady } from '../../lib/listening-playback';

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
  const pendingSeek = useRef<{ target: number; requestedAt: number } | null>(null);
  const pendingMediaPlay = useRef(false);
  useEffect(() => () => { pendingSeek.current = null; pendingMediaPlay.current = false; }, []);
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
    const timer = window.setInterval(() => {
      if (!loaded || !player.current) return;
      const pending = pendingSeek.current;
      if (pending) {
        const position = player.current.getCurrentTime();
        // YouTube can land on an earlier keyframe; allow that lead-in while
        // rejecting the stale position from the preceding playback.
        if (seekReady(position, pending.target, Date.now() - pending.requestedAt)) {
          pendingSeek.current = null; player.current.playVideo();
        } else if (Date.now() - pending.requestedAt > 5000) {
          pendingSeek.current = null; stopAt.current = null;
          setError('Video chưa tua đến câu này. Bấm Nghe câu này để thử lại.');
        }
        return;
      }
      if (stopAt.current !== null && player.current.getCurrentTime() >= stopAt.current) { player.current.pauseVideo(); stopAt.current = null; }
    }, 50);
    return () => { active = false; clearInterval(timer); instance?.destroy(); player.current = null; };
  }, [source.kind, source.videoId]);
  useImperativeHandle(ref, () => ({ play(start, end, originalSpeed) {
    // Captured audio must retain exact timestamps. Listening gets a short lead-in
    // to compensate for caption boundaries and player startup latency.
    const playbackStart = getPlaybackStart(start, originalSpeed);
    setError('');
    stopAt.current = end;
    if (originalSpeed) setSelectedRate(1);
    if (source.kind === 'YOUTUBE') {
      if (!ready || !player.current) { stopAt.current = null; setError('Trình phát đang tải, vui lòng thử lại.'); return; }
      player.current.pauseVideo();
      if (originalSpeed) player.current.setPlaybackRate(1);
      pendingSeek.current = { target: playbackStart, requestedAt: Date.now() };
      player.current.seekTo(playbackStart, true);
    }
    else if (media.current) {
      const element = media.current;
      element.pause(); if (originalSpeed) element.playbackRate = 1;
      pendingMediaPlay.current = true; element.currentTime = playbackStart;
      // play() also permits the browser to buffer the requested position; the
      // seeking guard below prevents stopping at the stale pre-seek position.
      void element.play().catch(() => { pendingMediaPlay.current = false; setError('Không phát được media. Kiểm tra đường dẫn hoặc bấm Phát trong trình phát.'); });
    }
  }, currentTime() { return source.kind === 'YOUTUBE' ? ready ? player.current?.getCurrentTime() ?? null : null : media.current?.currentTime ?? null; } }), [ready, source.kind]);
  const mediaEvents = { onCanPlay: () => { setReady(true); setRates([.5, .75, 1, 1.25, 1.5]); }, onPlaying: () => { if (!media.current?.seeking) pendingMediaPlay.current = false; onPlayed(); }, onSeeked: () => { pendingMediaPlay.current = false; }, onError: () => setError('Không tải được audio/video. Hãy báo lỗi nguồn hoặc chọn bài mẫu.'), onTimeUpdate: () => { if (media.current && !media.current.seeking && !pendingMediaPlay.current && stopAt.current !== null && media.current.currentTime >= stopAt.current) { media.current.pause(); stopAt.current = null; } } };
  return <div className="space-y-3">
    {source.kind === 'YOUTUBE' ? <div ref={host} className="listening-youtube" /> : source.kind === 'VIDEO' ? <video ref={media as Ref<HTMLVideoElement>} src={source.url} controls preload="metadata" className="w-full rounded" {...mediaEvents} /> : <audio ref={media as Ref<HTMLAudioElement>} src={source.url} controls preload="metadata" className="w-full" {...mediaEvents} />}
    <label className="flex items-center gap-2 text-sm text-ink-medium">Tốc độ phát <select aria-label="Tốc độ phát" disabled={!ready} value={selectedRate} onChange={event => { const rate = Number(event.target.value); setSelectedRate(rate); if (source.kind === 'YOUTUBE') player.current?.setPlaybackRate(rate); else if (media.current) media.current.playbackRate = rate; }} className="rounded border border-paper-kraft p-1">{rates.map(rate => <option key={rate} value={rate}>{rate}x</option>)}</select></label>
    <p className="text-xs text-ink-medium">Nghe lại phát sớm 0,75 giây để hạn chế mất từ đầu câu.</p>
    {error && <p role="alert" className="text-sm text-rose-800">{error} {source.kind === 'YOUTUBE' && <a className="underline" href={source.url} target="_blank" rel="noopener noreferrer">Mở trên YouTube</a>}</p>}
  </div>;
}
