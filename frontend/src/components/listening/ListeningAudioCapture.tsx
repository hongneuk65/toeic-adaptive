import { useEffect, useRef, useState } from 'react';

// Only the shared tab's audio is encoded. Video tracks are never recorded or uploaded.
export function ListeningAudioCapture({ seconds, play, upload, onBusy }: { seconds: number; play(): Promise<number>; upload(file: File, start: number, end: number): Promise<void>; onBusy(value: boolean): void }) {
  const [state, setState] = useState<'idle' | 'choosing' | 'recording' | 'uploading'>('idle');
  const [error, setError] = useState('');
  const stream = useRef<MediaStream | null>(null); const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<number | null>(null); const active = useRef(true); const stop = useRef<(() => void) | null>(null);
  useEffect(() => { active.current = true; return () => { active.current = false; if (timer.current) clearTimeout(timer.current); if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); }; }, []);
  useEffect(() => { onBusy(state !== 'idle'); return () => onBusy(false); }, [state, onBusy]);
  const capture = async () => {
    if (!navigator.mediaDevices?.getDisplayMedia || !window.MediaRecorder) { setError('Trình duyệt chưa hỗ trợ thu âm tab. Hãy dùng file audio bên dưới.'); return; }
    setError(''); setState('choosing');
    let shared: MediaStream | null = null;
    try {
      shared = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      stream.current = shared;
      if (!active.current) { shared.getTracks().forEach(track => track.stop()); return; }
      const tracks = shared.getAudioTracks();
      if (!tracks.length) throw new Error('Chưa chọn chia sẻ âm thanh. Hãy chọn tab có video và bật Chia sẻ âm thanh.');
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('Trình duyệt chưa hỗ trợ định dạng audio này. Hãy dùng file audio.');
      const chunks: Blob[] = []; let bytes = 0; let tooLarge = false;
      const mediaRecorder = new MediaRecorder(new MediaStream(tracks), { mimeType, audioBitsPerSecond: 64000 }); recorder.current = mediaRecorder;
      const startingAt = await play();
      if (!active.current) { shared.getTracks().forEach(track => track.stop()); return; }
      const startedAt = performance.now();
      mediaRecorder.ondataavailable = event => { if (event.data.size) { bytes += event.data.size; chunks.push(event.data); if (bytes > 10_000_000) { tooLarge = true; if (mediaRecorder.state === 'recording') mediaRecorder.stop(); } } };
      mediaRecorder.onstop = () => {
        if (timer.current) clearTimeout(timer.current);
        shared?.getTracks().forEach(track => track.stop()); stream.current = null;
        if (!active.current) return;
        const duration = Math.min(seconds, (performance.now() - startedAt) / 1000);
        if (tooLarge || duration < 1 || !bytes) { setError(tooLarge ? 'Audio vượt 10 MB. Chọn đoạn ngắn hơn.' : 'Đoạn thu quá ngắn. Hãy thử lại.'); setState('idle'); return; }
        setState('uploading');
        const file = new File(chunks, mimeType.includes('mp4') ? 'tab-audio.m4a' : 'tab-audio.webm', { type: mimeType });
        void upload(file, startingAt, startingAt + duration).catch(cause => { if (active.current) setError(cause instanceof Error ? cause.message : 'Không gửi được audio.'); }).finally(() => { if (active.current) setState('idle'); });
      };
      mediaRecorder.onerror = () => { setError('Không thu được audio. Hãy dùng file audio.'); if (mediaRecorder.state === 'recording') mediaRecorder.stop(); };
      stop.current = () => { if (mediaRecorder.state === 'recording') mediaRecorder.stop(); };
      shared.getVideoTracks().forEach(track => { track.onended = () => stop.current?.(); });
      mediaRecorder.start(1000); setState('recording'); timer.current = window.setTimeout(() => stop.current?.(), Math.min(seconds, 300) * 1000);
    } catch (cause) {
      shared?.getTracks().forEach(track => track.stop()); stream.current = null;
      if (active.current) { setState('idle'); setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Bạn đã huỷ chia sẻ âm thanh. Có thể thử lại hoặc dùng file audio.' : cause instanceof Error ? cause.message : 'Không thu được âm thanh tab.'); }
    }
  };
  return <div className="space-y-3 text-sm">
    <p>Chọn đúng tab đang phát video và bật chia sẻ âm thanh. Giữ video phát liên tục ở tốc độ 1x trong lúc thu. Hệ thống chỉ gửi audio để nhận dạng, không gửi hình ảnh màn hình.</p>
    {state === 'recording' ? <button className="primary-button" onClick={() => stop.current?.()}>Dừng và tạo lời thoại</button> : <button disabled={state !== 'idle' || seconds <= 0 || seconds > 300} className="primary-button" onClick={() => void capture()}>{state === 'choosing' ? 'Đang chờ chọn tab…' : state === 'uploading' ? 'Đang gửi audio…' : 'Tạo lời thoại từ âm thanh tab'}</button>}
    {state === 'recording' && <p role="status">Đang thu âm đoạn nghe, tự dừng sau tối đa {Math.round(seconds)} giây. Có thể dừng sớm.</p>}
    {error && <p role="alert" className="text-rose-800">{error}</p>}
  </div>;
}
