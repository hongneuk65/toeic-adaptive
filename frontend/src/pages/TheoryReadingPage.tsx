import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

interface LessonSummary {
  id: number;
  title: string;
  part: number;
}

interface LessonDetail {
  id: number;
  title: string;
  content: string;
  part: number;
  skill: { name: string; code: string };
}

export const TheoryReadingPage: React.FC = () => {
  const [part, setPart] = useState(5);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [currentLesson, setCurrentLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    api<LessonSummary[]>(`/theory/part/${part}`).then((data) => {
      setLessons(data);
      if (data.length > 0) {
        loadLesson(data[0].id);
      } else {
        setCurrentLesson(null);
      }
    });
  }, [part]);

  const loadLesson = (id: number) => {
    setLoading(true);
    api<LessonDetail>(`/theory/${id}`)
      .then((data) => setCurrentLesson(data))
      .finally(() => setLoading(false));
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. THANH TAB CHỌN PART 1 -> 7 (DẠNG THẺ GIẤY TẬP KẸP SỔ TRÀN VIỀN) */}
      <div className="w-full flex gap-2 border-b-2 border-paper-kraft overflow-x-auto pb-1">
        {[1, 2, 3, 4, 5, 6, 7].map((p) => (
          <button
            key={p}
            onClick={() => setPart(p)}
            className={`px-8 py-2.5 font-hand text-xl font-bold rounded-t-sm transition ${
              part === p
                ? 'bg-paper-white text-ink-dark border-t-2 border-x-2 border-paper-kraft shadow-paper-subtle -mb-0.5 z-10'
                : 'bg-paper-cream/80 text-ink-medium hover:bg-paper-kraft-light/40 border border-transparent'
            }`}
          >
            PART {p}
          </button>
        ))}
      </div>

      {/* 2. BỐ CỤC CHIA ĐÔI TOÀN MÀN HÌNH */}
      <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* CỘT TRÁI (3/12): MỤC LỤC SỔ TAY BÀI GIẢNG */}
        <div className="lg:col-span-3 bg-paper-white p-5 border-2 border-paper-kraft shadow-paper-subtle rounded-sm space-y-4">
          <div className="flex justify-between items-center border-b border-paper-kraft pb-2">
            <span className="font-mono text-xs font-bold text-ink-light uppercase">
              MỤC LỤC PART {part}
            </span>
            <span className="font-mono text-xs font-bold text-accent-coral">
              {lessons.length} BÀI HỌC
            </span>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {lessons.length === 0 ? (
              <p className="font-body text-xs text-ink-light py-4 text-center">
                Chưa có bài học nào trong Part này.
              </p>
            ) : (
              lessons.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => loadLesson(item.id)}
                  className={`w-full text-left p-3 rounded-sm font-body text-xs transition flex items-start gap-2.5 ${
                    currentLesson?.id === item.id
                      ? 'bg-paper-cream border-l-4 border-slate-900 font-bold text-ink-dark shadow-sm'
                      : 'text-ink-medium hover:bg-paper-cream/60 hover:text-ink-dark'
                  }`}
                >
                  <span className="font-mono font-bold text-ink-pencil shrink-0">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  <span className="leading-snug">{item.title}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* CỘT PHẢI (9/12): TRANG GIẤY TẬP ĐỌC LÝ THUYẾT (NOTEBOOK LINED PAPER) */}
        <div className="lg:col-span-9">
          {loading ? (
            <div className="w-full bg-paper-white p-16 border-2 border-paper-kraft text-center font-hand text-xl text-ink-light">
              Đang lật mở trang bài giảng...
            </div>
          ) : currentLesson ? (
            /* KHỐI TRANG GIẤY SỔ TAY CHÍNH */
            <div className="relative w-full bg-white border-2 border-paper-kraft shadow-paper-heavy rounded-sm p-8 sm:p-12 min-h-[650px] flex flex-col justify-between overflow-hidden">
              
              {/* Hai ghim bấm kim loại kẹp đỉnh trang giấy */}
              <div className="staple top-3 left-10" />
              <div className="staple top-3 right-10" />

              {/* Đường chỉ đỏ lề tập học sinh chạy dọc bên trái */}
              <div className="absolute top-0 left-12 sm:left-16 bottom-0 w-[2px] bg-rose-300/40 pointer-events-none" />

              {/* Nội dung bài học */}
              <div className="pl-6 sm:pl-10 space-y-6">
                
                {/* Header trang giấy: Mã skill đóng dấu mộc */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-dashed border-paper-kraft pb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-0.5 bg-paper-cream border border-paper-kraft text-slate-800 rounded-sm">
                      {currentLesson.skill.code}
                    </span>
                    <span className="font-mono text-xs font-semibold text-ink-light uppercase">
                      {currentLesson.skill.name}
                    </span>
                  </div>

                  <span className="font-mono text-[11px] text-ink-pencil uppercase tracking-widest">
                    TÀI LIỆU LÝ THUYẾT CHÍNH KHÓA
                  </span>
                </div>

                {/* Tiêu đề bài học */}
                <h1 className="font-hand text-3xl sm:text-4xl font-bold text-ink-dark tracking-wide pt-2">
                  {currentLesson.title}
                </h1>

                {/* Nội dung bài học: Phông tiêu chuẩn Nunito thẳng hàng, giãn dòng thoáng như viết trên dòng kẻ tập */}
                <div className="font-body text-slate-800 text-base leading-loose whitespace-pre-line pt-2 text-justify">
                  {currentLesson.content}
                </div>

              </div>

              {/* Chân trang giấy: Chuyển sang bài Quiz riêng biệt */}
              <div className="pl-6 sm:pl-10 pt-8 mt-12 border-t border-dashed border-paper-kraft flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="font-hand text-sm text-ink-pencil">
                  Đã đọc xong bài giảng? Hãy chuyển sang làm bài tập củng cố.
                </span>

                <button
                  onClick={() => navigate(`/theory/${currentLesson.id}/quiz`)}
                  className="w-full sm:w-auto px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-body text-xs font-bold uppercase tracking-wider rounded shadow transition"
                >
                  LÀM BÀI QUIZ CỦNG CỐ (5 CÂU) →
                </button>
              </div>

            </div>
          ) : (
            <div className="w-full bg-paper-white p-16 border-2 border-paper-kraft text-center font-hand text-xl text-ink-medium">
              Vui lòng chọn bài học từ danh sách mục lục bên trái.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
