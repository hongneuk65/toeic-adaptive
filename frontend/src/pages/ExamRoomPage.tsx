import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface ExamQuestion {
  id: number;
  part: number;
  passage?: string;
  audioUrl?: string;
  imageUrl?: string;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export const ExamRoomPage: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Trạng thái bật/tắt bảng danh sách câu hỏi Dropdown
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setIsPaletteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(`exam_${attemptId}`);
    if (!raw) {
      alert('Không tìm thấy dữ liệu đề thi. Vui lòng chọn lại đề.');
      navigate('/exam');
      return;
    }

    const data = JSON.parse(raw);
    setQuestions(data.questions || []);

    const minutes = data.examType === 'FULL' ? 120 : data.examType === 'MINI' ? 60 : 20;
    setTimeLeft(minutes * 60);
  }, [attemptId]);

  // Đếm ngược thời gian
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleSelect = (questionId: number, opt: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: opt }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const confirmSubmit = window.confirm(
        `Bạn mới hoàn thành ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`,
      );
      if (!confirmSubmit) return;
    }

    setSubmitting(true);
    try {
      const answerList = Object.entries(answers).map(([qId, selectedAnswer]) => ({
        questionId: Number(qId),
        selectedAnswer,
      }));

      await api('/exam/submit', {
        method: 'POST',
        data: {
          attemptId: Number(attemptId),
          answers: answerList,
        },
      });

      sessionStorage.removeItem(`exam_${attemptId}`);
      navigate(`/exam/${attemptId}/review`);
    } catch (err: any) {
      alert(err.message || 'Lỗi nộp bài thi');
      setSubmitting(false);
    }
  };

  const currentQ = questions[currentIndex];
  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);

  if (questions.length === 0) {
    return <div className="p-12 text-center text-slate-500 font-body">Đang chuẩn bị đề thi...</div>;
  }

  return (
    <div className="w-full min-h-[calc(100vh-5rem)] flex flex-col space-y-3 pb-6">
      
      {/* 1. THANH ĐIỀU HÀNH PHÒNG THI TRÀN VIỀN */}
      <div className="w-full bg-white px-6 py-3 border-b border-slate-200 shadow-sm flex justify-between items-center relative z-20">
        
        {/* Cụm trái: Thông tin Part & Tiến độ */}
        <div className="flex items-center gap-6">
          <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-700 rounded uppercase">
            PART {currentQ.part}
          </span>
          <div className="h-6 w-px bg-slate-200" />
          <span className="text-sm font-bold text-slate-800">
            Tiến độ: <span className="text-blue-700">{answeredCount}</span> / {questions.length} câu
          </span>
        </div>

        {/* Cụm giữa: Đồng hồ đếm ngược */}
        <div className="text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Thời gian còn lại</span>
          <span className="text-2xl font-mono font-black text-slate-900 leading-none">
            {formatTime(timeLeft)}
          </span>
        </div>

        {/* Cụm phải: NÚT DROPDOWN DANH SÁCH CÂU HỎI & NÚT NỘP BÀI */}
        <div className="flex items-center gap-3 relative" ref={paletteRef}>
          
          {/* Nút bấm mở Dropdown danh sách câu hỏi */}
          <button
            type="button"
            onClick={() => setIsPaletteOpen((prev) => !prev)}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded border transition flex items-center gap-2 ${
              isPaletteOpen
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <span>BẢNG CÂU HỎI ({answeredCount}/{questions.length})</span>
            <span className="text-[10px]">{isPaletteOpen ? '▲' : '▼'}</span>
          </button>

          {/* Hộp Dropdown hiện ra chứa danh sách câu 1 - 200 */}
          {isPaletteOpen && (
            <div className="absolute right-32 top-full mt-2 w-80 sm:w-96 bg-white border-2 border-slate-900 shadow-2xl rounded p-4 z-50">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                <span className="text-xs font-bold text-slate-700 uppercase">
                  Danh sách {questions.length} câu hỏi
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Đã làm {answeredCount} câu
                </span>
              </div>

              {/* Chú thích màu sắc */}
              <div className="flex items-center gap-4 text-[11px] text-slate-600 mb-3 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-blue-700 rounded-sm inline-block" />
                  <span>Đã chọn</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 bg-slate-100 border border-slate-300 rounded-sm inline-block" />
                  <span>Chưa làm</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 ring-2 ring-slate-900 rounded-sm inline-block" />
                  <span>Đang xem</span>
                </div>
              </div>

              {/* Lưới câu hỏi 10 cột, cuộn dọc mượt mà */}
              <div className="grid grid-cols-10 gap-1.5 max-h-72 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isCurrent = idx === currentIndex;

                  let btnClass = 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200';
                  if (isAnswered) {
                    btnClass = 'bg-blue-700 text-white border-blue-700 font-bold';
                  }
                  if (isCurrent) {
                    btnClass += ' ring-2 ring-slate-900 font-black';
                  }

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        setCurrentIndex(idx);
                        setIsPaletteOpen(false); // Chuyển câu và đóng dropdown
                      }}
                      className={`h-7 text-[11px] font-mono rounded transition flex items-center justify-center ${btnClass}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nút nộp bài thi */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded transition disabled:opacity-50"
          >
            {submitting ? 'ĐANG CHẤM BÀI...' : 'NỘP BÀI THI'}
          </button>
        </div>

      </div>

      {/* 2. KHÔNG GIAN THI CHIA ĐÔI MÀN HÌNH (SPLIT VIEW 50 - 50) */}
      <div className="w-full flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch px-2">

        {/* CỘT BÊN TRÁI: TƯ LIỆU ĐỀ THI (ẢNH / AUDIO / ĐOẠN VĂN ĐỌC PART 3, 4, 6, 7) */}
        <div className="bg-white p-6 border border-slate-200 rounded shadow-sm flex flex-col h-[calc(100vh-10rem)] overflow-hidden">
          <div className="border-b border-slate-100 pb-2 mb-4 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              TƯ LIỆU ĐỀ THI (PART {currentQ.part})
            </span>
            <span className="text-xs text-slate-400 font-mono">CÂU {currentIndex + 1}</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-3 space-y-4">
            {/* Audio nghe cho Part 1, 2, 3, 4 */}
            {currentQ.audioUrl && (
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <span className="text-xs font-bold text-slate-600 block mb-2 uppercase">File Nghe Audio:</span>
                <audio controls className="w-full h-9">
                  <source src={currentQ.audioUrl} type="audio/mpeg" />
                  Trình duyệt không hỗ trợ nghe audio.
                </audio>
              </div>
            )}

            {/* Hình ảnh cho Part 1 hoặc biểu đồ */}
            {currentQ.imageUrl && (
              <div className="w-full flex justify-center py-2 bg-slate-50 rounded border border-slate-100">
                <img
                  src={currentQ.imageUrl}
                  alt={`Tư liệu câu ${currentIndex + 1}`}
                  className="max-h-96 object-contain rounded"
                />
              </div>
            )}

            {/* Đoạn văn đọc Passage cho Part 6, 7 */}
            {currentQ.passage ? (
              <div className="bg-slate-50 p-5 rounded border border-slate-200">
                <span className="text-xs font-bold text-slate-500 uppercase block mb-3 border-b border-slate-200 pb-1">
                  Đoạn văn bài đọc (Passage)
                </span>
                <div className="font-body text-slate-800 text-sm leading-relaxed whitespace-pre-line">
                  {currentQ.passage}
                </div>
              </div>
            ) : !currentQ.audioUrl && !currentQ.imageUrl && (
              /* Part 5: Câu đơn không có đoạn văn */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded border border-dashed border-slate-200 text-slate-400">
                <p className="text-sm font-semibold uppercase">Part 5: Incomplete Sentences</p>
                <p className="text-xs mt-1 max-w-xs">
                  Phần này gồm các câu đơn độc lập. Bạn vui lòng đọc câu hỏi và chọn đáp án đúng ở cột bên phải.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CỘT BÊN PHẢI: NỘI DUNG CÂU HỎI + 4 PHƯƠNG ÁN ĐÁP ÁN (TOÀN BỘ KHÔNG GIAN THOÁNG MẮT) */}
        <div className="bg-white p-6 border border-slate-200 rounded shadow-sm flex flex-col justify-between h-[calc(100vh-10rem)] overflow-hidden">
          
          {/* Khu vực Câu hỏi & 4 lựa chọn A, B, C, D */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-6">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded">
                Câu hỏi số {currentIndex + 1}
              </span>
              <span className="text-xs text-slate-400 font-mono">ID: #{currentQ.id}</span>
            </div>

            {/* Câu hỏi */}
            <p className="text-lg font-bold text-slate-900 leading-relaxed">
              {currentQ.content}
            </p>

            {/* 4 Lựa chọn A B C D */}
            <div className="space-y-3 pt-2">
              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                const optText = currentQ[`option${opt}` as keyof ExamQuestion];
                const isSelected = answers[currentQ.id] === opt;

                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => handleSelect(currentQ.id, opt)}
                    className={`w-full p-4 text-left text-sm border rounded flex items-start gap-3 transition ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50 text-blue-900 font-bold ring-1 ring-blue-700'
                        : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-bold w-5 shrink-0">{opt}.</span>
                    <span className="leading-snug">{optText}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thanh chuyển câu ở đáy cột phải */}
          <div className="pt-4 border-t border-slate-200 flex justify-between items-center gap-4 bg-white">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex-1 py-3 border border-slate-300 text-slate-700 text-xs font-bold rounded uppercase hover:bg-slate-50 disabled:opacity-30 transition"
            >
              ← CÂU TRƯỚC
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              disabled={currentIndex === questions.length - 1}
              className="flex-1 py-3 border border-slate-300 text-slate-700 text-xs font-bold rounded uppercase hover:bg-slate-50 disabled:opacity-30 transition"
            >
              CÂU TIẾP THEO →
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};