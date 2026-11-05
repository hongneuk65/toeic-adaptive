import { useEffect, useRef, useState } from 'react';

interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognitionConstructor = new () => Recognition;
function speechConstructor() {
  const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
interface Capture { stream: MediaStream; recorder: MediaRecorder; speech?: Recognition; timer?: number; elapsed: number }

/** One microphone session owns recording and optional browser transcription. */
export function BrowserSpeechInput({ disabled = false, onTranscript, onActiveChange }: {
  disabled?: boolean; onTranscript(text: string): void; onActiveChange?(active: boolean): void;
}) {
  const [recording, setRecording] = useState(false);
  const [opening, setOpening] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [url, setUrl] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState('');
  const [speechSupported] = useState(() => Boolean(speechConstructor()));
  const capture = useRef<Capture | null>(null);
  const objectUrl = useRef('');
  const live = useRef(false);
  const starting = useRef(false);
  const generation = useRef(0);
  const callbacks = useRef({ onTranscript, onActiveChange });
  useEffect(() => { callbacks.current = { onTranscript, onActiveChange }; }, [onTranscript, onActiveChange]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false; generation.current++;
      const session = capture.current; capture.current = null;
      if (session) {
        clearInterval(session.timer);
        if (session.speech) { session.speech.onresult = null; session.speech.onerror = null; session.speech.onend = null; try { session.speech.abort(); } catch { /* Already closed. */ } }
        if (session.recorder.state !== 'inactive') session.recorder.stop();
        session.stream.getTracks().forEach(track => track.stop());
      }
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
      callbacks.current.onActiveChange?.(false);
    };
  }, []);
  const stop = () => {
    const session = capture.current;
    if (!session) return;
    clearInterval(session.timer);
    try { session.speech?.stop(); } catch { /* Recognition can end independently. */ }
    if (session.recorder.state !== 'inactive') session.recorder.stop();
  };
  const start = async () => {
    if (disabled || starting.current || capture.current) return;
    const current = ++generation.current;
    starting.current = true; setOpening(true); setError(''); setInterim('');
    callbacks.current.onActiveChange?.(true);
    let input: MediaStream | undefined;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) throw new Error('Thiết bị chưa hỗ trợ ghi âm. Bạn vẫn có thể nhập câu bên dưới.');
      input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!live.current) { input.getTracks().forEach(track => track.stop()); return; }
      const recorder = new MediaRecorder(input);
      const session: Capture = { stream: input, recorder, elapsed: 0 };
      capture.current = session;
      const chunks: Blob[] = [];
      let size = 0;
      recorder.ondataavailable = event => {
        if (!live.current || capture.current !== session) return;
        size += event.data.size;
        if (size <= 5 * 1024 * 1024) chunks.push(event.data);
        else { setError('Bản ghi đã đạt giới hạn dung lượng.'); stop(); }
      };
      recorder.onstop = () => {
        clearInterval(session.timer);
        session.stream.getTracks().forEach(track => track.stop());
        try { session.speech?.stop(); } catch { /* Already ended. */ }
        if (!live.current || capture.current !== session) return;
        capture.current = null; setRecording(false); setInterim(''); callbacks.current.onActiveChange?.(false);
        if (chunks.length) {
          if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
          objectUrl.current = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || chunks[0].type }));
          setUrl(objectUrl.current);
        }
      };
      recorder.onerror = () => {
        clearInterval(session.timer); session.stream.getTracks().forEach(track => track.stop());
        try { session.speech?.abort(); } catch { /* Already stopped. */ }
        if (!live.current || capture.current !== session) return;
        capture.current = null; setRecording(false); callbacks.current.onActiveChange?.(false);
        setError('Ghi âm bị gián đoạn. Hãy thử lại.');
      };
      recorder.start(500); setRecording(true); setSeconds(0);
      if (objectUrl.current) { URL.revokeObjectURL(objectUrl.current); objectUrl.current = ''; setUrl(''); }
      const Constructor = speechConstructor();
      if (Constructor) {
        try {
          const speech = new Constructor(); session.speech = speech;
          speech.lang = 'en-US'; speech.continuous = true; speech.interimResults = true;
          const committed = new Set<number>();
          speech.onresult = event => {
            if (!live.current || generation.current !== current) return;
            const final: string[] = []; const draft: string[] = [];
            Array.from(event.results).forEach((result, index) => {
              if (result.isFinal && !committed.has(index)) { committed.add(index); final.push(result[0].transcript); }
              else if (!result.isFinal) draft.push(result[0].transcript);
            });
            if (final.length) callbacks.current.onTranscript(final.join(' ').trim());
            setInterim(draft.join(' ').slice(0, 1000));
          };
          speech.onerror = event => { if (live.current && capture.current === session && event.error !== 'aborted') setError('Chưa chuyển được giọng nói thành chữ. Bản ghi vẫn được lưu để nghe lại.'); };
          speech.start();
        } catch { setError('Nhận giọng nói chưa khả dụng. Bạn vẫn có thể ghi âm và nhập câu.'); }
      }
      session.timer = window.setInterval(() => { session.elapsed++; if (live.current) setSeconds(session.elapsed); if (session.elapsed >= 60) stop(); }, 1000);
    } catch (cause) {
      input?.getTracks().forEach(track => track.stop()); capture.current = null;
      if (live.current) {
        setRecording(false); callbacks.current.onActiveChange?.(false);
        setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? 'Bạn chưa cho phép microphone. Cấp quyền rồi thử lại.' : cause instanceof Error ? cause.message : 'Không mở được microphone.');
      }
    } finally { starting.current = false; if (live.current) setOpening(false); }
  };
  return <div className="browser-speech-input speaking-microphone">
    <button type="button" className="speaking-mic-button" aria-label={opening ? 'Đang mở microphone' : recording ? 'Dừng ghi âm' : url ? 'Ghi âm lại' : 'Bắt đầu ghi âm'} aria-pressed={recording} disabled={opening || (disabled && !recording)} onClick={() => recording ? stop() : void start()}>
      {recording ? <span className="speaking-stop-icon" aria-hidden="true" /> : <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" /></svg>}
    </button>
    <p role="status" className="speaking-mic-status">{opening ? 'Đang mở mic…' : recording ? `Đang ghi · ${seconds}s / 60s` : url ? 'Nghe lại hoặc ghi câu mới' : 'Chạm mic để bắt đầu'}</p>
    {interim && <p className="speaking-interim" aria-live="polite">{interim}</p>}
    {url && <audio controls src={url} className="speaking-playback" aria-label="Nghe lại câu vừa nói" />}
    <p className="speaking-mic-note">{speechSupported ? 'Nói tiếng Anh để nhập câu. Nhận giọng nói có thể dùng dịch vụ của trình duyệt.' : 'Bạn có thể ghi âm nghe lại; hãy nhập câu bên dưới.'}</p>
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </div>;
}
