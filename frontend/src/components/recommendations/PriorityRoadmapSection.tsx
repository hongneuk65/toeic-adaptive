import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { PersonalizedRoadmapResult, RoadmapStep } from '../../types/rag';
import { LoadingSkeleton } from '../ui/LoadingSkeleton';

interface PriorityRoadmapSectionProps {
  onPracticeSkill: (skillId: number, skillName: string) => void;
}

export const PriorityRoadmapSection: React.FC<PriorityRoadmapSectionProps> = ({
  onPracticeSkill,
}) => {
  const navigate = useNavigate();
  const load = useCallback((signal: AbortSignal) =>
    api<PersonalizedRoadmapResult>('/rag/priority-roadmap', { signal }), []);
  const { data, loading, error, reload } = useAsyncResource(load);
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'P0' | 'P1' | 'P2'>('ALL');

  if (loading && !data) {
    return (
      <LoadingSkeleton label="Đang chuẩn bị lộ trình ưu tiên cá nhân hóa..." />
    );
  }

  if (error) {
    return <p role="alert" className="text-red-700">{error} <button onClick={reload}>Thử lại</button></p>;
  }
  if (!data || data.prioritySteps.length === 0) return null;

  const { summary, prioritySteps } = data;

  const filteredSteps = prioritySteps.filter((s) => {
    if (filterPriority === 'ALL') return true;
    if (filterPriority === 'P0') return s.priority === 'P0_CRITICAL';
    if (filterPriority === 'P1') return s.priority === 'P1_FOCUS';
    if (filterPriority === 'P2') return s.priority === 'P2_ADVANCED';
    return true;
  });

  return (
    <div className="space-y-4 rounded-lg border border-paper-kraft/70 bg-paper-white p-5 shadow-paper-medium sm:p-6">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 border-b border-paper-kraft pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            
            <h2 className="font-display text-2xl font-bold text-ink-dark sm:text-3xl">
              Lộ trình ưu tiên cá nhân hóa
            </h2>
          </div>
          <p className="font-body text-xs text-ink-medium mt-1">
            Được sinh tự động từ DAS3H & liên kết kho bài học lý thuyết
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded border border-emerald-400 bg-emerald-50 p-2.5">
          
          <div>
            <span className="font-mono text-[10px] text-emerald-800 uppercase font-bold block">
              Tiềm năng bứt phá:
            </span>
            <span className="font-display text-lg font-bold text-emerald-950">
              +{summary.estimatedPotentialIncrease} điểm TOEIC
            </span>
          </div>
        </div>
      </div>

      {/* KPI Badges */}
      <div className="grid grid-cols-2 gap-3 font-mono text-xs sm:grid-cols-4">
        <div className="rounded border border-rose-200 bg-rose-50 p-3">
          <span className="text-rose-800 text-[11px] block font-semibold">P0 - Cấp Bách</span>
          <span className="text-2xl font-bold text-rose-950 font-display">
            {summary.criticalCount} <span className="text-xs font-normal">kỹ năng</span>
          </span>
        </div>
        <div className="rounded border border-amber-200 bg-amber-50 p-3">
          <span className="text-amber-800 text-[11px] block font-semibold">P1 - Trọng Tâm ZPD</span>
          <span className="text-2xl font-bold text-amber-950 font-display">
            {summary.focusCount} <span className="text-xs font-normal">kỹ năng</span>
          </span>
        </div>
        <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
          <span className="text-emerald-800 text-[11px] block font-semibold">P2 - Nâng Cao</span>
          <span className="text-2xl font-bold text-emerald-950 font-display">
            {summary.masteredCount} <span className="text-xs font-normal">kỹ năng</span>
          </span>
        </div>
        <div className="rounded border border-paper-kraft bg-paper-cream p-3">
          <span className="text-ink-medium text-[11px] block font-semibold">Part Yếu Nhất</span>
          <span className="text-2xl font-bold text-slate-900 font-display">
            Part {summary.weakestPart}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-paper-kraft pb-2">
        {(
          [
            { id: 'ALL', label: `Tất cả (${prioritySteps.length})` },
            { id: 'P0', label: `P0 - Khẩn cấp (${summary.criticalCount})` },
            { id: 'P1', label: `P1 - Trọng tâm (${summary.focusCount})` },
            { id: 'P2', label: `P2 - Củng cố (${summary.masteredCount})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterPriority(tab.id)}
              className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-bold transition ${
              filterPriority === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-paper-cream hover:bg-paper-kraft-light/50 text-ink-dark border border-paper-kraft'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Steps List */}
      <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
        {filteredSteps.slice(0, 15).map((step: RoadmapStep) => {
          const isP0 = step.priority === 'P0_CRITICAL';
          const isP1 = step.priority === 'P1_FOCUS';

          const borderCol = isP0
            ? 'border-rose-300 bg-rose-50/30'
            : isP1
            ? 'border-amber-300 bg-amber-50/20'
            : 'border-paper-kraft bg-paper-cream/20';

          return (
            <div
              key={step.skillId}
              className={`flex flex-col items-start justify-between gap-3 rounded border p-3.5 transition hover:shadow-paper-subtle sm:flex-row sm:items-center ${borderCol}`}
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                      isP0
                        ? 'bg-rose-600 text-white'
                        : isP1
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {step.priorityLabel.split(' - ')[0]}
                  </span>
                  <span className="font-mono text-xs text-ink-light">Part {step.part}</span>
                  <span className="font-mono text-xs font-bold text-slate-800">[{step.skillCode}]</span>
                </div>

                <h4 className="font-body font-bold text-sm text-ink-dark">{step.skillName}</h4>
                <p className="font-body text-xs text-ink-medium">{step.actionText}</p>

                {step.recommendedLesson && (
                  <p className="font-body text-[11px] text-slate-700 flex items-center gap-1">
                    <span>Bài học:</span>
                    <button
                      onClick={() => navigate('/theory')}
                      className="text-slate-900 font-bold underline hover:text-accent-coral"
                    >
                      "{step.recommendedLesson.title}"
                    </button>
                  </p>
                )}
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                <div className="text-right">
                  <span className="font-mono text-xs text-ink-medium block">
                    Độ thông thạo: <strong className="text-ink-dark">{Math.round(step.masteryScore * 100)}%</strong>
                  </span>
                  <span className="font-mono text-[10px] text-emerald-800 font-semibold">
                    +{step.estimatedPointGain} điểm tiềm năng
                  </span>
                </div>

                <button
                  onClick={() => onPracticeSkill(step.skillId, step.skillName)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-body text-xs font-bold rounded shadow-sm transition whitespace-nowrap"
                >
                  Luyện tập ZPD
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
