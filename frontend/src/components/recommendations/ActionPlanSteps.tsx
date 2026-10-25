import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../ui/PageHeader';

export const ActionPlanSteps: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full space-y-4">
      <PageHeader
        title="Lộ trình cải thiện 3 bước"
        description="Ôn kiến thức, củng cố từ vựng và kiểm tra lại tiến bộ."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Bước 1 */}
        <div className="relative flex flex-col justify-between rounded-lg border border-paper-kraft/70 bg-paper-cream p-5 shadow-paper-subtle">
          <div>
            <span className="font-mono text-xs font-bold text-accent-coral uppercase block">BƯỚC 01</span>
            <h3 className="font-display text-xl font-bold text-ink-dark mt-1">Ôn kiến thức phần yếu</h3>
            <p className="font-body text-xs text-ink-medium mt-2">
              Dành 15–20 phút ôn quy tắc và chiến lược của Part thấp điểm nhất.
            </p>
          </div>
          <button
            onClick={() => navigate('/theory')}
            className="mt-5 w-full rounded border border-paper-kraft bg-paper-white py-2 text-xs font-bold text-ink-dark transition hover:bg-paper-kraft-light/50"
          >
            Mở kiến thức
          </button>
        </div>

        {/* Bước 2 */}
        <div className="relative flex flex-col justify-between rounded-lg border border-paper-kraft/70 bg-paper-cream p-5 shadow-paper-subtle">
          <div>
            <span className="font-mono text-xs font-bold text-accent-navy uppercase block">BƯỚC 02</span>
            <h3 className="font-display text-xl font-bold text-ink-dark mt-1">Ôn từ vựng</h3>
            <p className="font-body text-xs text-ink-medium mt-2">
              Lật thẻ theo chủ đề mỗi ngày để củng cố vốn từ thương mại.
            </p>
          </div>
          <button
            onClick={() => navigate('/flashcards')}
            className="mt-5 w-full rounded border border-paper-kraft bg-paper-white py-2 text-xs font-bold text-ink-dark transition hover:bg-paper-kraft-light/50"
          >
            Mở flashcard
          </button>
        </div>

        {/* Bước 3 */}
        <div className="relative flex flex-col justify-between rounded-lg border border-paper-kraft/70 bg-paper-cream p-5 shadow-paper-subtle">
          <div>
            <span className="font-mono text-xs font-bold text-accent-sage uppercase block">BƯỚC 03</span>
            <h3 className="font-display text-xl font-bold text-ink-dark mt-1">Làm mini test</h3>
            <p className="font-body text-xs text-ink-medium mt-2">
              Làm bài có giới hạn thời gian, xem kết quả và các câu cần ôn.
            </p>
          </div>
          <button
            onClick={() => navigate('/exam')}
            className="mt-5 w-full rounded bg-slate-900 py-2 text-xs font-bold text-white shadow transition hover:bg-slate-800"
          >
            Vào phòng thi
          </button>
        </div>
      </div>
    </div>
  );
};
