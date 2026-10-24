import { ActivitySuggestions } from '../components/ActivitySuggestions';
import { notifyLearningProgress } from '../lib/learning-progress';
import { VocabularyMemory, type VocabularyMemoryEstimate } from '../components/VocabularyMemory';
import '../styles/prep-knowledge.css';
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { FlashcardRecall, type RecallAttempt } from '../components/FlashcardRecall';
import { PageHeader } from '../components/ui/PageHeader';

interface Flashcard {
  id: number;
  word: string;
  phonetic?: string;
  meaning: string;
  example?: string;
  notes?: string;
  topic?: string;
  sourceVersionId?: number;
}

interface FolderDetail {
  id: number;
  name: string;
  description?: string;
  count: number;
  authorName: string;
  isOwner: boolean;
}

interface CardReview { cardId: number; known: boolean; reviewCount: number; dueAt?: string; intervalDays?: number; schedulingSource?: string; memory?: VocabularyMemoryEstimate }

export const FlashcardStudyPage: React.FC = () => {
  const { topic: folderId } = useParams<{ topic: string }>();
  return <FlashcardStudy key={folderId} folderId={folderId} />;
};

const FlashcardStudy: React.FC<{ folderId?: string }> = ({ folderId }) => {
  const navigate = useNavigate();

  const load = useCallback(async (signal: AbortSignal) => {
    const [folder, cards, reviews] = await Promise.all([
      api<FolderDetail>(`/flashcards/folders/${folderId}`, { signal }),
      api<Flashcard[]>(`/flashcards/folders/${folderId}/cards`, { signal }),
      api<CardReview[]>(`/flashcards/folders/${folderId}/reviews`, { signal }),
    ]);
    return { folder, cards, reviews, estimatedAt: Date.now() };
  }, [folderId]);
  const { data, loading, error, reload: loadData } = useAsyncResource(load);
  const folder = data?.folder;
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'needed' | 'known' | 'due'>('due');
  const [sessionReviewed, setSessionReviewed] = useState<number[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [dueTime, setDueTime] = useState(() => Date.now());
  useEffect(() => {
    const refresh = () => setDueTime(new Date().getTime());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, []);
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    const known = new Set((data?.reviews ?? []).filter(review => review.known).map(review => review.cardId));
    const reviews = new Map((data?.reviews ?? []).map(review => [review.cardId, review]));
    return (data?.cards ?? []).filter(card =>
      (card.word.toLowerCase().includes(query) || card.meaning.toLowerCase().includes(query)) &&
      (reviewFilter === 'all' || (reviewFilter === 'due' ? !reviews.get(card.id)?.dueAt || Date.parse(reviews.get(card.id)!.dueAt!) <= dueTime : reviewFilter === 'known' ? known.has(card.id) : !known.has(card.id))) &&
      (!sessionActive || !sessionReviewed.includes(card.id)));
  }, [data, search, reviewFilter, sessionActive, sessionReviewed, dueTime]);

  // Quản lý trạng thái lật thẻ cho từng thẻ
  const [flippedIds, setFlippedIds] = useState<Record<number, boolean>>({});

  // Chế độ xem: 'grid' hoặc 'focus'
  const [viewMode, setViewMode] = useState<'grid' | 'focus'>('focus');
  const [focusIndex, setFocusIndex] = useState(0);
  const [visibleCards, setVisibleCards] = useState(24);

  // Modal thêm từ
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, isModalOpen, () => setIsModalOpen(false));
  const [newWord, setNewWord] = useState('');
  const [newPhonetic, setNewPhonetic] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const navigationLocked = reviewingId !== null || retryingId !== null;
  const reviewBusy = useRef(false);
  const pendingReviews = useRef(new Map<number, { known: boolean; attempt: RecallAttempt }>());

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

  const reviewCard = async (id: number, known: boolean, recall?: RecallAttempt): Promise<boolean> => {
    if (reviewBusy.current) return false;
    const payload = pendingReviews.current.get(id) ?? { known, attempt: recall ?? { attemptId: crypto.randomUUID(), recallMode: 'self_report' as const } };
    pendingReviews.current.set(id, payload);
    reviewBusy.current = true;
    setReviewingId(id);
    setActionError('');
    try {
      const result = await api<CardReview>(`/flashcards/cards/${id}/review`, { method: 'PATCH', data: { known: payload.known, ...payload.attempt } });
      notifyLearningProgress();
      pendingReviews.current.delete(id);
      setRetryingId(null);
      if (sessionActive) { setSessionReviewed(ids => [...ids, id]); setFocusIndex(0); setFlippedIds({}); }
      const scheduleLabel = result.schedulingSource === 'hlr-prior-experimental' ? 'Lịch cá nhân hóa thử nghiệm' : result.schedulingSource?.startsWith('hlr-trained:') ? 'Lịch cá nhân hóa từ dữ liệu ôn' : 'Lịch ôn cố định';
      setNotice(`${result.known ? 'Đã nhớ' : 'Cần ôn thêm'}${result.dueAt ? ` · Ôn tiếp: ${new Date(result.dueAt).toLocaleString('vi-VN')}` : ''} · ${scheduleLabel}.`);
      setDueTime(new Date().getTime());
      loadData();
      return true;
    } catch (cause) { setRetryingId(id); setActionError(`${getErrorMessage(cause)} Lượt ôn chưa được xác nhận. Nhấn lưu lại để thử lại cùng lượt.`); return false; }
    finally { reviewBusy.current = false; setReviewingId(null); }
  };
  const reviewControls = (card: Flashcard) => {
    const review = data?.reviews.find(item => item.cardId === card.id);
    return <div className="text-xs space-y-2" onClick={event => event.stopPropagation()}>
      {card.sourceVersionId && <p className="text-ink-medium">Nguồn: {card.topic || 'Reading'} · bản {card.sourceVersionId}</p>}
      {card.notes && <p className="text-ink-medium">{card.notes}</p>}
      <p>{review?.known ? 'Đã nhớ' : 'Cần ôn'} · {review?.reviewCount || 0} lượt ôn của bạn</p>
      {review?.dueAt && <p className="text-ink-medium">Ôn tiếp: {new Date(review.dueAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}</p>}
      <p className="text-ink-medium">Xem thẻ: kết quả dưới đây do bạn tự đánh giá, không phải kiểm tra gõ đáp án.</p>
      <div className="flex gap-2 justify-center"><button disabled={reviewingId !== null || (retryingId !== null && retryingId !== card.id)} className="secondary-button text-xs" onClick={() => void reviewCard(card.id, false)}>Cần ôn</button><button disabled={reviewingId !== null || (retryingId !== null && retryingId !== card.id)} className="secondary-button text-xs" onClick={() => void reviewCard(card.id, true)}>Đã nhớ</button></div>
    </div>;
  };

  const toggleFlip = (id: number) => {
    setFlippedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Phát âm bản xứ chuẩn qua Web Speech API
  const playAudio = (word: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!('speechSynthesis' in window)) {
      setActionError('Trình duyệt chưa hỗ trợ phát âm. Bạn vẫn có thể ôn nghĩa của từ.');
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
      setActionError('Nhập từ và nghĩa tiếng Việt để tiếp tục.');
      return;
    }

    setSubmitting(true);
    setActionError('');
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
    } catch (err) {
      setActionError(getErrorMessage(err, 'Chưa thêm được từ. Hãy thử lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`page-stack prep-knowledge-page prep-flashcard-page ${viewMode === 'focus' ? 'prep-flashcard-focus mx-auto w-full max-w-3xl' : 'prep-flashcard-library'}`}>
      {notice && <p role="status" className="status-message">{notice}</p>}
      {actionError && <p role="alert" className="status-message text-rose-800">{actionError}</p>}
      {error && <p role="alert" className="status-message">{error} <button className="text-action" onClick={loadData}>Thử lại</button></p>}
      
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
          transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
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
          overflow-y: auto;
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
        @media (prefers-reduced-motion: reduce) {
          .flip-card-inner { transition: none; }
        }
      `}</style>

      <div className="prep-flashcard-heading space-y-3">
        <button onClick={() => navigate('/flashcards')} className="text-action text-sm">Thư mục từ vựng</button>
        <PageHeader variant={viewMode === 'focus' ? 'compact' : 'feature'} title={folder?.name || 'Từ vựng'} description={folder?.description}  />
      </div>
      <div className="grid grid-cols-1 gap-3 border-b border-paper-kraft pb-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div role="group" aria-label="Chế độ ôn từ vựng" className="prep-knowledge-tabs flex w-fit rounded-lg bg-paper-cream p-1"><button aria-pressed={viewMode === 'focus'} disabled={navigationLocked} onClick={() => handleSwitchViewMode('focus')} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${viewMode === 'focus' ? 'bg-paper-white text-ink-dark shadow-sm' : 'text-ink-medium'}`}>Ôn tập trung</button><button aria-pressed={viewMode === 'grid'} disabled={navigationLocked} onClick={() => handleSwitchViewMode('grid')} className={`min-h-11 rounded-lg px-3 text-sm font-semibold ${viewMode === 'grid' ? 'bg-paper-white text-ink-dark shadow-sm' : 'text-ink-medium'}`}>Tất cả thẻ</button></div>
        <div className="flex w-full items-center gap-3 sm:col-span-2 sm:row-start-2"><input type="search" disabled={navigationLocked} value={search} onChange={event => { setSearch(event.target.value); setFocusIndex(0); setVisibleCards(24); setFlippedIds({}); }} aria-label="Tìm từ vựng" placeholder="Tìm từ hoặc nghĩa…" className="min-w-0 flex-1 rounded-lg border border-paper-kraft bg-paper-white px-3 py-2.5 text-sm" /><span className="shrink-0 text-xs text-ink-medium">{filtered.length} từ</span></div>
        {folder?.isOwner && <button onClick={() => setIsModalOpen(true)} className="secondary-button justify-self-start sm:col-start-2 sm:row-start-1 sm:justify-self-end">Thêm từ</button>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-ink-medium">Lọc thẻ <select disabled={navigationLocked} aria-label="Lọc trạng thái ghi nhớ" value={reviewFilter} onChange={event => { setReviewFilter(event.target.value as 'all' | 'needed' | 'known' | 'due'); setFocusIndex(0); setFlippedIds({}); setSessionActive(false); }} className="min-h-11 rounded-lg border border-paper-kraft bg-paper-white px-3 ml-2"><option value="due">Đến hạn ôn</option><option value="needed">Cần ôn</option><option value="known">Đã nhớ</option><option value="all">Tất cả</option></select></label>
        <button className="secondary-button" disabled={navigationLocked || (!sessionActive && filtered.length === 0)} onClick={() => { setSessionReviewed([]); setSessionActive(value => !value); setFocusIndex(0); setFlippedIds({}); }}>{sessionActive ? 'Kết thúc buổi ôn' : 'Bắt đầu buổi ôn'}</button>
        {sessionActive && <p role="status" className="text-sm text-ink-medium">Đã ôn {sessionReviewed.length} thẻ · còn {filtered.length} thẻ. Mỗi thẻ chỉ xuất hiện một lần trong buổi.</p>}
      </div>

      {/* 2. Danh sách thẻ */}
      {loading && !data ? (
        <div role="status" className="learning-surface text-sm text-ink-medium">
          Đang tải từ vựng…
        </div>
      ) : error && !data ? null : filtered.length === 0 ? (
        <div className="w-full rounded-xl bg-paper-white px-5 py-10 text-center space-y-3">
          <p className="text-base font-medium text-ink-medium">{sessionActive ? 'Bạn đã hoàn thành các thẻ trong buổi ôn này.' : search ? 'Không có từ khớp với tìm kiếm.' : reviewFilter === 'due' ? 'Chưa có thẻ đến hạn. Chọn Tất cả để học thêm.' : reviewFilter === 'needed' ? 'Không còn thẻ cần ôn. Chọn Tất cả để xem thư mục.' : reviewFilter === 'known' ? 'Chưa có thẻ được đánh dấu đã nhớ.' : 'Thư mục này chưa có từ vựng nào.'}</p>
          {search && <button className="secondary-button" onClick={() => { setSearch(''); setFocusIndex(0); }}>Xóa tìm kiếm</button>}
          {folder?.isOwner && !search && !sessionActive && data?.cards.length === 0 && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="primary-button"
            >
              Thêm từ đầu tiên
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* Lưới ô thẻ */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.slice(0, visibleCards).map((card, idx) => {
            const isFlipped = !!flippedIds[card.id];
            return (
              <div
                key={card.id}
                tabIndex={0} role="group" aria-label={`Thẻ ${card.word}. Nhấn Enter hoặc phím cách để lật.`} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); toggleFlip(card.id); } }} onClick={() => toggleFlip(card.id)}
                className="perspective-container h-80 w-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 cursor-pointer"
              >
                <div className={`flip-card-inner ${isFlipped ? 'flipped' : ''}`}>
                  
                  {/* Mặt trước */}
                  <div inert={isFlipped} aria-hidden={isFlipped} className="flip-card-front bg-paper-white border border-paper-kraft p-5 flex flex-col justify-between">
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-[10px] text-ink-light uppercase ml-auto">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                    </div>

                    <div className="text-center my-auto px-1 space-y-1">
                      <h3 className="text-2xl font-bold text-ink-dark leading-tight break-words">
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
                        className="secondary-button mt-3"
                      >
                        Phát âm
                      </button>
                    </div>

                    <p className="text-xs text-ink-pencil text-center">
                      Nhấn để xem nghĩa
                    </p>
                  </div>

                  {/* Mặt sau */}
                  <div inert={!isFlipped} aria-hidden={!isFlipped} className="flip-card-back bg-paper-cream border border-paper-kraft p-5 flex flex-col justify-between text-left">
                    
                    <div className="pt-2 overflow-y-auto max-h-[180px] pr-1">
                      <span className="text-[10px] font-mono font-bold text-accent-sage uppercase block">
                        NGHĨA TIẾNG VIỆT:
                      </span>
                      <p className="text-base font-medium font-bold text-ink-dark mt-1 leading-snug break-words">
                        {card.meaning}
                      </p>
                      {card.example && (
                        <p className="font-body text-xs text-ink-medium italic mt-2 bg-white/80 p-2 border-l-2 border-accent-sage rounded-r break-words">
                          "{card.example}"
                        </p>
                      )}
                    </div>

                    {reviewControls(card)}
                    <p className="text-xs text-ink-pencil text-center mt-2">
                      (Chạm để lật lại mặt trước)
                    </p>
                  </div>

                </div>
              </div>
            );
          })}
          {filtered.length > visibleCards && <div className="col-span-full flex flex-wrap items-center justify-center gap-3 py-4"><span className="text-sm text-ink-medium">Đang hiện {visibleCards} / {filtered.length} từ</span><button className="secondary-button" onClick={() => setVisibleCards(count => count + 24)}>Xem thêm 24 từ</button></div>}
        </div>
      ) : (
        /* Chế độ Focus */
        <div className="w-full space-y-4">
          {(() => {
            const card = filtered[focusIndex] || filtered[0];
            return (
              <>
                <VocabularyMemory memory={data?.reviews.find(review => review.cardId === card.id)?.memory} estimatedAt={data?.estimatedAt ?? dueTime} currentTime={dueTime} />
                <FlashcardRecall key={card.id} card={card} pending={reviewingId !== null} onReview={reviewCard} />

                <div className="flex justify-between items-center gap-2 max-w-3xl mx-auto text-sm">
                  <button
                    onClick={handlePrevCard}
                    disabled={navigationLocked || focusIndex === 0}
                    className="secondary-button px-3 sm:px-5"
                  >
                    Thẻ trước
                  </button>
                  <span role="status" className="text-sm font-semibold text-ink-dark shrink-0">
                    {Math.min(focusIndex + 1, filtered.length)} / {filtered.length}
                  </span>
                  <button
                    onClick={handleNextCard}
                    disabled={navigationLocked || focusIndex === filtered.length - 1}
                    className="secondary-button px-3 sm:px-5"
                  >
                    Thẻ tiếp
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {!loading && data && <ActivitySuggestions section="vocabulary" compact excludeHref={`/flashcards/${folderId}`} />}

      {/* 3. Modal thêm từ */}
      {isModalOpen && folder?.isOwner && (
        <div className="modal-backdrop fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div ref={dialog} role="dialog" aria-modal="true" aria-label="Thêm từ vựng" tabIndex={-1} className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-paper-white border border-paper-kraft rounded p-5 sm:p-8 relative">

            <div className="flex justify-between items-center border-b-2 border-paper-kraft pb-3 mb-6">
              <div>
                <span className="font-mono text-xs font-bold text-accent-coral uppercase">
                  Thư mục: {folder.name}
                </span>
                <h2 className="font-display text-3xl font-bold text-ink-dark">
                  Thêm từ vựng
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-ink-pencil hover:text-ink-dark font-mono text-base font-bold"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleCreateWord} className="space-y-4">
              {actionError && <p role="alert" className="text-sm text-rose-800">{actionError}</p>}
              <div>
                <label className="block text-sm font-medium text-ink-dark mb-0.5">
                  Từ tiếng Anh *
                </label>
                <input
                  type="text"
                  required
                  value={newWord}
                  onChange={(e) => setNewWord(e.target.value)}
                  aria-label="Từ tiếng Anh" placeholder="Ví dụ: Negotiation"
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-dark mb-0.5">
                  Phiên âm IPA
                </label>
                <input
                  type="text"
                  aria-label="Phiên âm IPA" value={newPhonetic}
                  onChange={(e) => setNewPhonetic(e.target.value)}
                  placeholder="/nɪˌɡoʊ.ʃiˈeɪ.ʃən/"
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-dark mb-0.5">
                  Nghĩa tiếng Việt *
                </label>
                <input
                  type="text"
                  required
                  aria-label="Nghĩa tiếng Việt" value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                  placeholder="Ví dụ: Sự thương lượng, đàm phán"
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink-dark mb-0.5">
                  Câu ví dụ ngữ cảnh
                </label>
                <textarea
                  rows={2}
                  aria-label="Câu ví dụ ngữ cảnh" value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="Ví dụ: The contract is under negotiation."
                  className="w-full px-3 py-2 bg-paper-cream border-2 border-paper-kraft text-ink-dark font-body text-sm rounded-sm focus:outline-none focus:border-slate-900 resize-none"
                />
              </div>

              <div className="pt-4 border-t border-paper-kraft flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="secondary-button"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="primary-button"
                >
                  {submitting ? 'Đang lưu…' : 'Lưu từ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
