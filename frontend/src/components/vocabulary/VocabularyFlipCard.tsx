import { useState } from 'react';

interface Card { id: number; word: string; meaning: string; phonetic?: string; example?: string }
export function VocabularyFlipCard({ card, pending, onReview }: { card: Card; pending: boolean; onReview(id: number, known: boolean): Promise<boolean> }) {
  const [flipped, setFlipped] = useState(false);
  const [audioError, setAudioError] = useState('');
  const listen = () => {
    if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === 'undefined') { setAudioError('Thiết bị chưa có giọng đọc.'); return; }
    setAudioError(''); window.speechSynthesis.cancel();
    const voice = new SpeechSynthesisUtterance(card.word); voice.lang = 'en-US'; voice.rate = .85;
    voice.onerror = event => { if (event.error !== 'canceled' && event.error !== 'interrupted') setAudioError('Chưa phát được giọng đọc.'); };
    window.speechSynthesis.speak(voice);
  };
  return <section className="vocabulary-flip-session" aria-label="Học bằng flashcard">
    <button type="button" className="vocabulary-flip-card" aria-label="Lật thẻ" aria-pressed={flipped} disabled={pending} onClick={() => setFlipped(value => !value)}>
      <span className={`vocabulary-flip-inner${flipped ? ' is-flipped' : ''}`}>
        <span className="vocabulary-flip-face" aria-hidden={flipped}><span className="vocabulary-flip-label">TỪ VỰNG</span><span className="vocabulary-flip-word" lang="en">{card.word}</span>{card.phonetic && <span className="vocabulary-flip-phonetic">{card.phonetic}</span>}<span className="vocabulary-flip-hint">Chạm để xem nghĩa ↻</span></span>
        <span className="vocabulary-flip-face vocabulary-flip-back" aria-hidden={!flipped}><span className="vocabulary-flip-label">NGHĨA</span><span className="vocabulary-flip-meaning">{card.meaning}</span>{card.example && <span className="vocabulary-flip-example" lang="en">{card.example}</span>}<span className="vocabulary-flip-hint">Chạm để xem từ ↻</span></span>
      </span>
    </button>
    <div className="vocabulary-flip-tools"><button className="study-action-button" type="button" onClick={listen}>Nghe phát âm</button>{flipped && <span>Tự đánh giá</span>}</div>
    {flipped && <div className="vocabulary-flip-rating"><button type="button" className="secondary-button" disabled={pending} onClick={() => void onReview(card.id, false)}>Cần ôn</button><button type="button" className="primary-button" disabled={pending} onClick={() => void onReview(card.id, true)}>Đã nhớ</button></div>}
    {audioError && <p role="status">{audioError}</p>}
  </section>;
}
