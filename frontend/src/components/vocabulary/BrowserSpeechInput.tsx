import { useEffect, useRef, useState } from 'react';

interface SpeechResult { isFinal: boolean; 0: { transcript: string } }
interface SpeechEvent { results: ArrayLike<SpeechResult> }
interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecognitionConstructor = new () => Recognition;
function speechConstructor() {
  const browser = window as typeof window & { SpeechRecognition?: RecognitionConstructor; webkitSpeechRecognition?: RecognitionConstructor };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}
const errorMessages: Record<string, string> = {
  'not-allowed': 'Bạn chưa cho phép microphone. Bạn có thể nhập câu bằng bàn phím.',
  'service-not-allowed': 'Trình duyệt không cho phép dịch vụ nhận giọng nói. Hãy nhập câu bằng bàn phím.',
  'no-speech': 'Chưa nhận được lời nói. Hãy nói rõ hơn rồi thử lại.',
  network: 'Không kết nối được dịch vụ nhận giọng nói. Hãy thử lại hoặc nhập câu.',
  'audio-capture': 'Không mở được microphone. Kiểm tra thiết bị rồi thử lại.',
  'language-not-supported': 'Dịch vụ chưa hỗ trợ nhận giọng tiếng Anh trên thiết bị này.',
};

export function BrowserSpeechInput({ disabled = false, onTranscript, onActiveChange }: {
  disabled?: boolean; onTranscript(text: string): void; onActiveChange?(active: boolean): void;
}) {
  const [supported] = useState(() => Boolean(speechConstructor()));
  const [listening, setListening] = useState(false);
  const [preview, setPreview] = useState({ final: '', interim: '' });
  const [error, setError] = useState('');
  const instance = useRef<Recognition | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const live = useRef(true);
  const notify = useRef(onActiveChange);
  useEffect(() => { notify.current = onActiveChange; }, [onActiveChange]);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false; clearTimeout(timer.current);
      const active = instance.current; instance.current = null;
      if (active) { active.onresult = null; active.onerror = null; active.onend = null; active.abort(); }
      notify.current?.(false);
    };
  }, []);
  const start = () => {
    const Constructor = speechConstructor();
    if (disabled || instance.current || !Constructor) return;
    let recognition: Recognition;
    try { recognition = new Constructor(); } catch { setError('Thiết bị chưa khởi động được nhận giọng nói. Bạn có thể nhập câu.'); return; }
    instance.current = recognition; setListening(true); notify.current?.(true); setError(''); setPreview({ final: '', interim: '' });
    const release = () => { instance.current = null; clearTimeout(timer.current); setListening(false); notify.current?.(false); };
    recognition.lang = 'en-US'; recognition.continuous = false; recognition.interimResults = true;
    recognition.onresult = event => {
      if (!live.current || instance.current !== recognition) return;
      const final: string[] = []; const interim: string[] = [];
      Array.from(event.results).forEach(result => (result.isFinal ? final : interim).push(result[0].transcript));
      setPreview({ final: final.join(' ').trim().slice(0, 1000), interim: interim.join(' ').trim().slice(0, 1000) });
    };
    recognition.onerror = event => {
      if (!live.current || instance.current !== recognition || event.error === 'aborted') return;
      setError(errorMessages[event.error] ?? 'Nhận giọng nói bị gián đoạn. Bạn vẫn có thể nhập câu.');
      release();
      try { recognition.abort(); } catch { /* Already stopped by the browser. */ }
    };
    recognition.onend = () => {
      if (!live.current || instance.current !== recognition) return;
      release();
    };
    try {
      recognition.start();
      timer.current = window.setTimeout(() => {
        if (live.current && instance.current === recognition) {
          release(); setError('Đã dừng sau 60 giây. Kiểm tra câu nhận dạng bên dưới.');
          try { recognition.abort(); } catch { /* Recognition already ended. */ }
        }
      }, 60000);
    } catch {
      release(); setError('Không khởi động được nhận giọng nói. Hãy thử lại hoặc nhập câu.');
    }
  };
  if (!supported) return <p className="text-sm text-ink-medium">Trình duyệt này chưa hỗ trợ nói để nhập. Bạn có thể gõ câu vào ô bên dưới.</p>;
  return <div className="browser-speech-input space-y-3">
    <p className="text-xs text-ink-medium">Trình duyệt có thể gửi âm thanh tới dịch vụ nhận giọng nói.</p>
    <button type="button" disabled={disabled && !listening} className="secondary-button" onClick={() => listening ? instance.current?.stop() : start()}>{listening ? 'Dừng nhận giọng nói' : 'Nói để nhập câu'}</button>
    {listening && <p role="status" className="text-sm text-ink-medium">Đang nghe tiếng Anh…</p>}
    {(preview.final || preview.interim) && <div className="rounded-lg border border-paper-kraft p-3 space-y-2">
      <p className="text-sm break-words" aria-live="polite">{preview.final}{preview.interim && <span className="text-ink-medium"> {preview.interim}</span>}</p>
      {preview.final && !listening && <button type="button" className="secondary-button" disabled={disabled} onClick={() => { onTranscript(preview.final); setPreview({ final: '', interim: '' }); }}>Dùng bản nhận dạng</button>}
    </div>}
    {error && <p role="alert" className="text-sm text-rose-800">{error}</p>}
  </div>;
}
