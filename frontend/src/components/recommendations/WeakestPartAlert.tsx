import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PartMasteryItem } from '../../types/mastery';
import { PART_META } from '../../types/mastery';

interface Props {
  weakestPart: PartMasteryItem | null;
  onPracticePart: (part: number) => void;
}

export const WeakestPartAlert: React.FC<Props> = ({ weakestPart, onPracticePart }) => {
  const navigate = useNavigate();

  if (!weakestPart || weakestPart.averageMastery >= 0.65) {
    return null;
  }

  const meta = PART_META[weakestPart.part];

  return (
    <div className="relative w-full rounded-lg border border-paper-kraft bg-paper-cream p-4 shadow-paper-subtle sm:p-5">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded border border-amber-400 bg-white px-2 py-0.5 font-mono text-xs font-bold text-amber-900">
              Bắt đầu từ đây
            </span>
            <span className="text-base font-semibold text-ink-dark">
              {(meta?.title || `Part ${weakestPart.part}`).split(' (')[0]} 
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-medium">
            {meta?.advice || 'Hệ thống nhận thấy bạn hay mất điểm ở phần này. Hãy ưu tiên ôn lý thuyết và làm bài thích ứng ngay.'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            onClick={() => navigate('/theory')}
            className="rounded bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow transition hover:bg-slate-800"
          >
            Ôn lý thuyết
          </button>
          <button
            onClick={() => onPracticePart(weakestPart.part)}
            className="rounded border border-amber-400 bg-white px-4 py-2 text-xs font-bold text-amber-900 transition hover:bg-amber-100"
          >
            Luyện tập
          </button>
        </div>
      </div>
    </div>
  );
};
