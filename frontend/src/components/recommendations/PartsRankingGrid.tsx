import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { PartMasteryItem } from '../../types/mastery';
import { PART_META } from '../../types/mastery';
import { PageHeader } from '../ui/PageHeader';

interface Props {
  sortedParts: PartMasteryItem[];
  onPracticePart: (part: number) => void;
}

export const PartsRankingGrid: React.FC<Props> = ({ sortedParts, onPracticePart }) => {
  const navigate = useNavigate();

  const getMasteryColor = (score: number) => {
    if (score < 0.45) return { bg: 'bg-rose-100', text: 'text-rose-800', border: 'border-rose-300', label: 'Báo động (Yếu)' };
    if (score < 0.60) return { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', label: 'Cần củng cố' };
    if (score < 0.80) return { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', label: 'Khá / Ổn định' };
    return { bg: 'bg-sky-100', text: 'text-sky-800', border: 'border-sky-300', label: 'Thành thạo' };
  };

  return (
    <div className="w-full space-y-4 rounded-lg border border-paper-kraft/70 bg-paper-white p-5 shadow-paper-medium sm:p-6">
      <PageHeader
        title="Xếp hạng năng lực 7 Part"
        description="Part yếu nhất được đưa lên đầu để bạn ưu tiên thời gian ôn tập."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedParts.map((item, idx) => {
          const meta = PART_META[item.part] || {
            title: item.partName,
            section: item.part <= 4 ? 'Listening' : 'Reading',
            description: 'Luyện tập kỹ năng làm bài TOEIC theo chuẩn ETS.',
            advice: 'Cần duy trì luyện tập thường xuyên.',
          };

          const masteryInfo = getMasteryColor(item.averageMastery);

          return (
            <div
              key={item.part}
              className="relative flex flex-col justify-between rounded-lg border border-paper-kraft/70 bg-paper-cream p-4 shadow-paper-subtle transition-colors hover:border-accent-coral"
            >
              <div className="staple top-2 left-4" />

              <div>
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="font-mono text-xs px-2 py-0.5 bg-paper-white border border-paper-kraft rounded text-ink-dark font-bold">
                    #0{idx + 1} • {meta.section}
                  </span>
                  <span className={`font-body text-xs font-bold px-2 py-0.5 rounded border ${masteryInfo.bg} ${masteryInfo.text} ${masteryInfo.border}`}>
                    {masteryInfo.label}
                  </span>
                </div>

                <h3 className="font-body font-bold text-lg text-ink-dark line-clamp-1">
                  {meta.title}
                </h3>
                <p className="font-body text-xs text-ink-medium mt-1 line-clamp-2">
                  {meta.description}
                </p>

                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-ink-light">Điểm thông thạo:</span>
                    <span className="font-bold text-ink-dark">{Math.round(item.averageMastery * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        item.averageMastery < 0.45 ? 'bg-rose-500' : item.averageMastery < 0.6 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(5, item.averageMastery * 100)}%` }}
                    />
                  </div>
                </div>

                <p className="font-body text-xs text-ink-pencil italic mt-3 bg-paper-white/60 p-2 rounded border border-dashed border-paper-kraft">
                  <span className="font-bold">Lời khuyên:</span> {meta.advice}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-paper-kraft/40 pt-3">
                <button
                  onClick={() => navigate('/theory')}
                  className="flex-1 py-1.5 px-2 bg-paper-white hover:bg-paper-kraft-light/40 border border-paper-kraft text-ink-dark font-body text-xs font-bold rounded transition text-center"
                >
                  Xem Lý Thuyết
                </button>
                <button
                  onClick={() => onPracticePart(item.part)}
                  className="flex-1 py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-white font-body text-xs font-bold rounded transition text-center shadow-sm"
                >
                  Luyện ZPD
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
