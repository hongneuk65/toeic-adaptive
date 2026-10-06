import { useEffect, useRef, useState } from 'react';

export function SpeakingRecorder({ maximumSeconds, onRecorded }: { maximumSeconds: number; onRecorded(): void }) {
  const recorder = useRef<MediaRecorder | null>(null); const stream = useRef<MediaStream | null>(null); const timer = useRef<number | undefined>(undefined); const objectUrl = useRef(''); const active = useRef(true);
  const [recording, setRecording] = useState(false); const [url, setUrl] = useState(''); const [error, setError] = useState(''); const [seconds, setSeconds] = useState(0);
  const [requesting, setRequesting] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; if (recorder.current?.state === 'recording') recorder.current.stop(); stream.current?.getTracks().forEach(track => track.stop()); clearInterval(timer.current); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }; }, []);
  const record = async () => {
    if (requesting) return;
    setRequesting(true);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Trình duyệt chưa hỗ trợ ghi âm. Hãy dùng Chrome/Edge trên HTTPS hoặc localhost.');
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input; const chunks: Blob[] = []; let size = 0;
      const instance = new MediaRecorder(input); recorder.current = instance;
      instance.ondataavailable = event => { size += event.data.size; if (size <= 5 * 1024 * 1024) chunks.push(event.data); else { setError('Bản ghi đã đạt giới hạn 5 MB.'); if (instance.state === 'recording') instance.stop(); } };
      instance.onstop = () => {
        input.getTracks().forEach(track => track.stop()); clearInterval(timer.current);
        if (!active.current) return;
        setRecording(false); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
        const next = URL.createObjectURL(new Blob(chunks, { type: instance.mimeType })); objectUrl.current = next; setUrl(next); onRecorded();
      };
      instance.onerror = () => { input.getTracks().forEach(track => track.stop()); clearInterval(timer.current); if (active.current) { setRecording(false); setError('Ghi âm bị gián đoạn. Hãy thử lại.'); } };
      instance.start(500); setRecording(true); setSeconds(0); let elapsed = 0;
      timer.current = window.setInterval(() => { elapsed++; setSeconds(elapsed); if (elapsed >= maximumSeconds && instance.state === 'recording') instance.stop(); }, 1000);
    } catch (cause) { stream.current?.getTracks().forEach(track => track.stop()); if (active.current) setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Bạn chưa cho phép microphone. Cấp quyền trong trình duyệt rồi ghi lại, hoặc chuyển sang chép câu.' : cause instanceof Error ? cause.message : 'Không mở được microphone.'); }
    finally { if (active.current) setRequesting(false); }
  };
  return <div className="space-y-3">
    <p className="text-sm text-ink-medium">Ghi âm để tự đối chiếu · chưa có ASR và chấm phát âm. Bản ghi chỉ ở trình duyệt, tự bỏ khi rời bài.</p>
    <button disabled={requesting} className="primary-button" onClick={() => recording ? recorder.current?.stop() : void record()}>{requesting ? 'Đang mở microphone...' : recording ? `Dừng ghi · ${seconds}/${maximumSeconds}s` : url ? 'Ghi âm lại' : 'Bắt đầu ghi âm'}</button>
    {url && <audio src={url} controls className="w-full" />}
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </div>;
}
