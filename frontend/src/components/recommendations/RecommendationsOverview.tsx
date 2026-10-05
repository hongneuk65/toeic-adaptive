import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../ui/PageHeader';

interface Props {
  overallMastery: number;
  listeningAvg: number;
  readingAvg: number;
  weakSkillsCount: number;
  totalSkillsCount: number;
}

export const RecommendationsOverview: React.FC<Props> = ({
  overallMastery,
  listeningAvg,
  readingAvg,
  weakSkillsCount,
  totalSkillsCount,
}) => {
  const navigate = useNavigate();

  return (
    <div className="w-full space-y-4">
      <PageHeader
        eyebrow="LỘ TRÌNH CÁ NHÂN"
        title="Hôm nay học gì?"
        description="Chọn một kỹ năng, bắt đầu một bài luyện."
        actions={
          <>
            <button
              onClick={() => navigate('/exam')}
              className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-slate-800"
            >
              Thi thử
            </button>
            <button
              onClick={() => navigate('/theory')}
              className="rounded border border-paper-kraft bg-paper-cream px-4 py-2 text-sm font-bold text-ink-dark transition hover:bg-paper-kraft-light/50"
            >
              Lý thuyết
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 divide-x divide-paper-kraft/60 rounded border border-paper-kraft bg-paper-white sm:grid-cols-4">
        {[
          ['Tổng quan', `${Math.round(overallMastery * 100)}%`],
          ['Nghe', `${Math.round(listeningAvg * 100)}%`],
          ['Đọc', `${Math.round(readingAvg * 100)}%`],
          ['Cần ôn', `${weakSkillsCount}/${totalSkillsCount}`],
        ].map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <span className="block text-xs text-ink-light">{label}</span>
            <strong className="text-xl font-semibold text-ink-dark">{value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
};
