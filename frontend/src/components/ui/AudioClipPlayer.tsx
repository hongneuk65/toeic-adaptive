import { useRef, useState } from 'react';
import { MediaButton } from './MediaButton';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function AudioClipPlayer({ src, label = 'Nghe bản ghi', className = '' }: { src: string; label?: string; className?: string }) {
  return <Clip key={src} src={src} label={label} className={className} />;
}
function Clip({ src, label, className }: { src: string; label: string; className: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const toggle = async () => {
    if (!audio.current) return;
    if (!audio.current.paused) { audio.current.pause(); return; }
    setError('');
    try { await audio.current.play(); } catch { setError('Chưa phát được âm thanh. Hãy thử lại.'); }
  };
  return <div className="audio-clip-control">
    <div className="audio-control-row">
      <audio ref={audio} className={className} src={src} preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)} onLoadedMetadata={() => { const value = audio.current?.duration; setDuration(value && Number.isFinite(value) ? value : 0); }} onError={() => { setPlaying(false); setError('Không tải được âm thanh.'); }} />
      <MediaButton label={playing ? `Tạm dừng · ${label}` : label} active={playing} onClick={() => void toggle()} />
      <input type="range" className="audio-seek" aria-label={`Tua · ${label}`} min={0} max={duration || 1} step={.1} value={Math.min(position, duration || 1)} disabled={!duration} onChange={event => { if (audio.current) { audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); } }} />
      <span className="audio-time">{clock(position)}{duration ? ` / ${clock(duration)}` : ''}</span>
    </div>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </div>;
}
