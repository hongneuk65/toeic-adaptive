import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface Flashcard {
  id: number;
  word: string;
  phonetic?: string;
  meaning: string;
  example?: string;
}

interface FolderDetail {
  id: number;
  name: string;
  description?: string;
  count: number;
  authorName: string;
  isOwner: boolean;
}

export const FlashcardStudyPage: React.FC = () => {
  const { topic: folderId } = useParams<{ topic: string }>();
  const navigate = useNavigate();

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [folder, setFolder] = useState<FolderDetail | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Quản lý trạng thái lật thẻ cho từng thẻ
  const [flippedIds, setFlippedIds] = useState<Record<number, boolean>>({});

  // Chế độ xem: 'grid' hoặc 'focus'
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('grid');
  const [focusIndex, setFocusIndex] = useState(0);

  // Modal thêm từ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 1. Tải thông tin Folder và danh sách thẻ từ
  const loadData = () => {
    if (!folderId) return;
    setLoading(true);

    // Lấy chi tiết Folder
    api(`/flashcards/folders/${folderId}`)
      .then((res: any) => {
        const data = res?.data || res;
        setFolder(data);
      })
      .catch((err) => console.error('Lỗi tải folder:', err));

    // Lấy danh sách từ trong Folder
    api(`/flashcards/folders/${folderId}/cards`)
      .then((res: any) => {
        const raw = res?.data || res;
        const list = Array.isArray(raw) ? raw : raw?.items || [];
        setCards(list);
      })
      .catch((err) => {
        console.error('Lỗi tải thẻ từ:', err);
        setCards([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    setFlippedIds({});
    setFocusIndex(0);
  }, [folderId]);

  // Đổi chế độ: Tự động lật về mặt chính
  const handleSwitchViewMode = (mode: 'grid' | 'focus') => {
    setViewMode(mode);
    setFlippedIds({});
  };

  // Đổi thẻ ở chế độ Focus: Tự động lật về mặt chính
  const handlePrevCard = () => {
    if (focusIndex > 0) {
      setFlippedIds({});
      setFocusIndex((prev) => prev - 1);
    }
  };

  const handleNextCard = () => {
    if (focusIndex < filtered.length - 1) {
      setFlippedIds({});
      setFocusIndex((prev) => prev + 1);
    }
  };

  const toggleFlip = (id: number) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Phát âm bản xứ chuẩn qua Web Speech API
  const playAudio = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt chưa hỗ trợ phát âm.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  };

  // Thêm từ vựng mới vào Folder
  const handleCreateWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWord.trim() || !newMeaning.trim()) {
      alert('Vui lòng điền đầy đủ từ vựng và nghĩa tiếng Việt.');
      return;
    }

    setSubmitting(true);
    try {
      await api(`/flashcards/folders/${folderId}/cards`, {
        method: 'POST',
        data: {
          word: newWord.trim(),
          phonetic: newPhonetic.trim() || undefined,
          meaning: newMeaning.trim(),
          example: newExample.trim() || undefined,
        },
      });

      setNewWord('');
      setNewPhonetic('');
      setNewMeaning('');
      setNewExample('');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi thêm từ');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search.trim()) return cards;
    const q = search.toLowerCase().trim();
    return cards.filter(
      (c) =>
        c.word.toLowerCase().includes(q) || c.meaning.toLowerCase().includes(q)
    );
  }, [cards, search]);

  return (
    <div className="w-full space-y-6">
      
      {/* CSS 3D chuẩn xác */}
      <style>{`
        .perspective-container {
          perspective: 1000px;
          -webkit-perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
        }
        .flip-card-inner.flipped {
          transform: rotateY(180deg);
          -webkit-transform: rotateY(180deg);
        }
        .flip-card-front, .flip-card-back {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden !important;
          backface-visibility: hidden !important;
          border-radius: 2px;
          overflow: hidden;
        }
        .flip-card-front {
          transform: rotateY(0deg) translateZ(1px);
          -webkit-transform: rotateY(0deg) translateZ(1px);
          z-index: 2;
        }
        .flip-card-back {
          transform: rotateY(180deg) translateZ(1px);
          -webkit-transform: rotateY(180deg) translateZ(1px);
          z-index: 1;
        }
        .flip-card-inner.flipped .flip-card-front {
          z-index: 1;
        }
        .flip-card-inner.flipped .flip-card-back {
          z-index: 2;
        }
      `}</style>

      {/* 1. Header & Điều hướng */}
      <div className="w-full bg-paper-white p-6 border-2 border-paper-kraft shadow-paper-subtle rounded-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/flashcards')}
            className="px-4 py-2 bg-paper-cream hover:bg-paper-kraft-light/50 border border-paper-kraft text-ink-dark font-hand text-lg font-bold rounded-sm transition"
          >
            ← TRỞ VỀ TỦ FOLDER
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent-coral uppercase">
                THƯ MỤC: {folder?.name || 'Đang tải...'}
              </span>
              {folder && (
                <span
                  className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-xs uppercase ${
                    folder.isOwner
                      ? 'bg-slate-900 text-white'
                      : 'bg-paper-cream text-ink-medium border border-paper-kraft'
                  }`}
                >
                  {folder.isOwner ? 'BẠN LÀ CHỦ SỞ HỮU' : `TÁC GIẢ: ${folder.authorName}`}
                </span>
              )}
            </div>
            <h1 className="font-display text-4xl font-bold text-ink-dark mt-0.5">
              Kho Thẻ Flashcard ({filtered.length} từ)
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm từ vựng..."
            className="px-4 py-2 bg-paper-cream border border-paper-kraft font-body text-xs text-ink-dark rounded-sm focus:outline-none focus:border-slate-900 w-full sm:w-56"
          />

          <div className="flex bg-paper-cream border border-paper-kraft rounded-sm p-0.5">
            <button
              onClick={() => handleSwitchViewMode('grid')}
              className={`px-3 py-1.5 font-hand text-base font-bold rounded-sm transition ${
                viewMode === 'grid'
                  ? 'bg-slate-900 text-white'
                  : 'text-ink-medium hover:text-ink-dark'
              }`}
            >
              LƯỚI Ô THẺ
            </button>
            <button
              onClick={() => handleSwitchViewMode('focus')}
              className={`px-3 py-1.5 font-hand text-base font-bold rounded-sm transition ${
                viewMode === 'focus'
                  ? 'bg-slate-900 text-white'
                  : 'text-ink-medium hover:text-ink-dark'
              }`}
            >
              LẬT THẺ TO
            </button>
          </div>

          {folder?.isOwner && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-2 bg-accent-coral hover:bg-[#c9664c] text-white font-hand text-lg font-bold rounded-sm shadow-paper-subtle transition uppercase"
            >
              + THÊM TỪ VÀO SỔ
            </button>
          )}
        </div>
      </div>

      {/* 2. Danh sách thẻ */}
      {loading ? (
        <div className="w-full bg-paper-white p-16 border-2 border-paper-kraft text-center font-hand text-2xl text-ink-light">
          Đang lật tìm hồ sơ từ vựng...
        </div>
      ) : filtered.length === 0 ? (
        <div className="w-full bg-paper-white p-16 text-center border-2 border-dashed border-paper-kraft rounded-sm space-y-3">
          <p className="font-hand text-2xl text-ink-medium">Thư mục này chưa có từ vựng nào.</p>
          {folder?.isOwner && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-2 bg-slate-900 text-white font-hand text-lg font-bold rounded"
            >
              + THÊM TỪ ĐẦU TIÊN
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Lưới ô thẻ */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filtered.map((card, idx) => {
            const isFlipped = !!flippedIds[card.id];
            return (
              <div
                key={card.id}
                onClick={() => toggleFlip(card.id)}
                className="perspective-container h-64 w-full cursor-pointer select-none"
              >
                <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
                  
                  {/* Mặt trước */}
                  <div className="flip-card-front bg-paper-white border-2 border-paper-kraft p-4 flex flex-col justify-between shadow-paper-subtle hover:shadow-paper-medium transition-shadow">
                    <div className="flex justify-between items-center">
                      <div className="staple top-2 left-2" />
                      <span className="font-mono text-[10px] text-ink-light uppercase ml-auto">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="text-center my-auto px-1 space-y-1">
                      <h3 className="font-display text-3xl md:text-4xl font-bold text-ink-dark leading-tight break-words">
                        {card.word}
                      </h3>
                      {card.phonetic && (
                        <p className="font-mono text-xs text-accent-navy break-words">
                          {card.phonetic}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={(e) => playAudio(card.word, e)}
                        className="mt-3 px-3 py-1 bg-paper-cream hover:bg-paper-kraft-light/50 border border-paper-kraft text-ink-dark font-mono text-[11px] font-bold rounded transition uppercase"
                      >
                        [ PHÁT ÂM ]
                      </button>
                    </div>

                    <p className="font-hand text-xs text-ink-pencil text-center">
                      (Chạm để xem nghĩa ↩)
                    </p>
                  </div>

                  {/* Mặt sau */}
                  <div className="flip-card-back bg-paper-cream border-2 border-accent-sage p-4 flex flex-col justify-between text-left shadow-paper-medium">
                    <div className="tape tape-mint w-14 top-[-6px] right-3" />
                    
                    <div className="pt-2 overflow-y-auto max-h-[180px] pr-1">
                      <span className="text-[10px] font-mono font-bold text-accent-sage uppercase block">
                        NGHĨA TIẾNG VIỆT:
                      </span>
                      <p className="font-hand text-2xl font-bold text-ink-dark mt-1 leading-snug break-words">
                        {card.meaning}
                      </p>
                      {card.example && (
                        <p className="font-body text-xs text-ink-medium italic mt-2 bg-white/80 p-2 border-l-2 border-accent-sage rounded-r break-words">
                          "{card.example}"
                        </p>
                      )}
                    </div>

                    <p className="font-hand text-[11px] text-ink-pencil text-center mt-2">
                      (Chạm để lật lại mặt trước)
                    </p>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Chế độ Focus */
        <div className="max-w-xl mx-auto space-y-4">
          {(() => {
            const card = filtered[focusIndex] || filtered[0];
            const isFlipped = !!flippedIds[card.id];
            return (
              <>
                <div
                  onClick={() => toggleFlip(card.id)}
                  className="perspective-container h-[360px] w-full cursor-pointer select-none"
                >
                  <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
                    
                    {/* Mặt trước to */}
                    <div className="flip-card-front bg-paper-white border-2 border-paper-kraft p-8 flex flex-col justify-center items-center text-center shadow-paper-heavy">
                      <div className="tape tape-pink w-24 top-[-10px] left-1/2 -translate-x-1/2" />
                      
                      <span className="font-mono text-xs font-bold text-ink-light uppercase mb-2">
                        THƯ MỤC: {folder?.name}
                      </span>
                      <h2 className="font-display text-5xl md:text-6xl font-bold text-ink-dark break-words max-w-full px-4">
                        {card.word}
                      </h2>
                      {card.phonetic && (
                        <p className="font-mono text-xl text-accent-navy mt-1">
                          {card.phonetic}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={(e) => playAudio(card.word, e)}
                        className="mt-6 px-6 py-2 bg-paper-cream hover:bg-paper-kraft-light/50 border-2 border-paper-kraft text-ink-dark font-mono text-xs font-bold rounded uppercase transition"
                      >
                        [ NGHE PHÁT ÂM CHUẨN ]
                      </button>

                      <p className="font-hand text-base text-ink-pencil mt-5">
                        (Chạm vào thẻ để lật xem giải nghĩa ↩)
                      </p>
                    </div>

                    {/* Mặt sau to */}
                    <div className="flip-card-back bg-paper-cream border-2 border-accent-sage p-8 flex flex-col justify-center items-center text-center shadow-paper-heavy">
                      <div className="tape tape-mint w-24 top-[-10px] left-1/2 -translate-x-1/2" />
                      
                      <span className="font-mono text-xs font-bold text-accent-sage uppercase block mb-1">
                        GIẢI THÍCH CHI TIẾT
                      </span>
                      <p className="font-hand text-3xl md:text-4xl font-bold text-ink-dark break-words max-w-full px-4">
                        {card.meaning}
                      </p>
                      {card.example && (
                        <div className="bg-white/90 p-4 border-l-4 border-accent-coral rounded-r max-w-md text-left mt-5 overflow-y-auto max-h-32">
                          <span className="text-[10px] font-mono font-bold text-ink-light uppercase block mb-0.5">
                            VÍ DỤ NGỮ CẢNH:
                          </span>
                          <p className="font-body text-sm text-ink-dark italic break-words">
                            "{card.example}"
                          </p>
                        </div>
                      )}

                      <p className="font-hand text-sm text-ink-pencil mt-4">
                        (Chạm để quay lại mặt từ tiếng Anh)
                      </p>
                    </div>

                  </div>
                </div>

                <div className="flex justify-between items-center bg-paper-white p-3 border-2 border-paper-kraft rounded-sm shadow-paper-subtle">
                  <button
                    onClick={handlePrevCard}
                    disabled={focusIndex === 0}
                    className="px-5 py-1.5 bg-paper-cream border border-paper-kraft font-hand text-lg font-bold text-ink-dark rounded disabled:opacity-30 transition hover:bg-paper-kraft-light/40"
                  >
                    ← THẺ TRƯỚC
                  </button>
                  <span className="font-hand text-xl font-bold text-ink-dark">
                    {focusIndex + 1} / {filtered.length}
                  </span>
                  <button
                    onClick={handleNextCard}
                    disabled={focusIndex === filtered.length - 1}
                    className="px-5 py-1.5 bg-paper-cream border border-paper-kraft font-hand text-lg font-bold text-ink-dark rounded disabled:opacity-30 transition hover:bg-paper-kraft-light/40"
                  >
                    THẺ KẾ TIẾP →
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* 3. Modal thêm từ */}
      {isModalOpen && folder?.isOwner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-paper-white border-2 border-paper-kraft shadow-paper-heavy rounded-sm p-8 relative">
            <div className="staple top-3 left-6" />
            <div className="tape tape-mint w-24 top-[-10px] right-10" />

            <div className="flex justify-between items-center border-b-2 border-paper-kraft pb-3 mb-6">
              <div>
                <span className="font-mono text-xs font-bold text-accent-coral uppercase">
                  THÊM THẺ VÀO: {folder.name}
                </span>
                <h2 className="font-display text-3xl font-bold text-ink-dark">
                  Ghi Chép Từ Vựng
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-pencil hover:text-ink-dark font-mono text-base font-bold"
              >
                [ ĐÓNG ]
              </button>
            </div>

            <form onSubmit={handleCreateWord} className="space-y-4">
              <div>
                <label className="block font-hand text-lg text-ink-dark mb-0.5">
                  Từ tiếng Anh *
                </label>
                <input
                  type="text"
                  required
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  placeholder="Ví dụ: Negotiation"
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-hand text-lg text-ink-dark mb-0.5">
                  Phiên âm IPA
                </label>
                <input
                  type="text"
                  value={newPhonetic}
                  onChange={(e) => setNewPhonetic(e.target.value)}
                  placeholder="/nɪˌɡoʊ.ʃiˈeɪ.ʃən/"
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-hand text-lg text-ink-dark mb-0.5">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="Ví dụ: Sự thương lượng, đàm phán"
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block font-hand text-lg text-ink-dark mb-0.5">
                  Câu ví dụ ngữ cảnh
                </label>
                <textarea
                  rows={2}
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Ví dụ: The contract is under negotiation."
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-paper-kraft flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 bg-paper-cream border border-paper-kraft font-hand text-lg font-bold text-ink-medium rounded"
                >
                  HỦY BỎ
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-hand text-lg font-bold rounded shadow transition disabled:opacity-50"
                >
                  {submitting ? 'ĐANG LƯU...' : 'LƯU VÀO SỔ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};