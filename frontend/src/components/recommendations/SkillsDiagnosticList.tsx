import React, { useState } from 'react';
import type { SkillMasteryItem } from '../../types/mastery';
import { SkillRow } from './SkillRow';

interface Props {
  skills: SkillMasteryItem[];
  totalSkillsCount: number;
  sectionFilter: 'all' | 'listening' | 'reading';
  setSectionFilter: (filter: 'all' | 'listening' | 'reading') => void;
  statusFilter: 'all' | 'weak' | 'unpracticed' | 'mastered';
  setStatusFilter: (filter: 'all' | 'weak' | 'unpracticed' | 'mastered') => void;
  onStartPractice: (skill: SkillMasteryItem) => void;
}

export const SkillsDiagnosticList: React.FC<Props> = ({
  skills,
  totalSkillsCount,
  sectionFilter,
  setSectionFilter,
  statusFilter,
  setStatusFilter,
  onStartPractice,
}) => {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(skills.length / 6));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleSkills = skills.slice(currentPage * 6, currentPage * 6 + 6);

  return (
    <section className="rounded border border-paper-kraft bg-paper-white shadow-paper-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-kraft px-4 py-4 sm:px-5">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-dark">Kỹ năng cần ôn</h2>
          <p className="text-xs text-ink-light mt-1">{skills.length} / {totalSkillsCount} kỹ năng · ưu tiên mức thông thạo thấp</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <select aria-label="Lọc theo phần thi" value={sectionFilter}
            onChange={(event) => { setSectionFilter(event.target.value as Props['sectionFilter']); setPage(0); }}
            className="rounded border border-paper-kraft bg-paper-cream px-3 py-2 text-ink-dark">
            <option value="all">Nghe & Đọc</option>
            <option value="listening">Nghe · Part 1–4</option>
            <option value="reading">Đọc · Part 5–7</option>
          </select>
          <select aria-label="Lọc theo mức độ" value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value as Props['statusFilter']); setPage(0); }}
            className="rounded border border-paper-kraft bg-paper-cream px-3 py-2 text-ink-dark">
            <option value="weak">Cần ôn (&lt;60%)</option>
            <option value="all">Tất cả</option>
            <option value="unpracticed">Chưa luyện</option>
            <option value="mastered">Đã vững (≥60%)</option>
          </select>
        </div>
      </div>
      {skills.length === 0 ? (
        <p className="p-8 text-center text-sm text-ink-medium">Chưa có kỹ năng phù hợp với bộ lọc này.</p>
      ) : (
        <div className="divide-y divide-paper-kraft/60">
          {visibleSkills.map((skill) => <SkillRow key={skill.skillId} skill={skill} onStartPractice={onStartPractice} />)}
        </div>
      )}
      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 border-t border-paper-kraft px-4 py-3 text-xs text-ink-medium">
          <span>{currentPage * 6 + 1}–{Math.min((currentPage + 1) * 6, skills.length)} / {skills.length} kỹ năng</span>
          <div className="flex items-center gap-3">
            <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="rounded border border-paper-kraft px-3 py-1.5 hover:bg-paper-cream disabled:opacity-35">Trước</button>
            <span>{currentPage + 1} / {pageCount}</span>
            <button disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="rounded border border-paper-kraft px-3 py-1.5 hover:bg-paper-cream disabled:opacity-35">Tiếp</button>
          </div>
        </div>
      )}
    </section>
  );
};
