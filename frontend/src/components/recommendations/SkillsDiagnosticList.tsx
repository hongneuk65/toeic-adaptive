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
    <section className="page-section">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-kraft pb-4">
        <div>
          <h2 className="section-title">Kỹ năng của bạn</h2>
          <p className="text-sm text-ink-medium mt-1">{skills.length} / {totalSkillsCount} kỹ năng · chọn để luyện tiếp</p>
        </div>
        <div role="group" aria-label="Lọc kỹ năng" className="grid w-full gap-2 text-sm sm:w-auto sm:grid-cols-2">
          <select aria-label="Lọc theo phần thi" value={sectionFilter}
            onChange={(event) => { setSectionFilter(event.target.value as Props['sectionFilter']); setPage(0); }}
            className="min-h-11 rounded-md border border-paper-kraft bg-paper-white px-3 py-2 text-ink-dark">
            <option value="all">Nghe & Đọc</option>
            <option value="listening">Nghe · Part 1–4</option>
            <option value="reading">Đọc · Part 5–7</option>
          </select>
          <select aria-label="Lọc theo mức độ" value={statusFilter}
            onChange={(event) => { setStatusFilter(event.target.value as Props['statusFilter']); setPage(0); }}
            className="min-h-11 rounded-md border border-paper-kraft bg-paper-white px-3 py-2 text-ink-dark">
            <option value="weak">Cần ôn</option>
            <option value="all">Tất cả</option>
            <option value="unpracticed">Chưa luyện</option>
            <option value="mastered">Duy trì</option>
          </select>
        </div>
      </div>
      {skills.length === 0 ? (
        <div className="p-6 space-y-3 text-sm text-ink-medium"><p>Chưa có kỹ năng phù hợp với bộ lọc này.</p>{totalSkillsCount > 0 && <button className="secondary-button" onClick={() => { setSectionFilter('all'); setStatusFilter('all'); setPage(0); }}>Xem tất cả kỹ năng</button>}</div>
      ) : (
        <div className="divide-y divide-paper-kraft/60">
          {visibleSkills.map((skill) => <SkillRow key={skill.skillId} skill={skill} onStartPractice={onStartPractice} />)}
        </div>
      )}
      {pageCount > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-paper-kraft px-4 py-3 text-xs text-ink-medium">
          <span>{currentPage * 6 + 1}–{Math.min((currentPage + 1) * 6, skills.length)} / {skills.length} kỹ năng</span>
          <div className="flex items-center gap-3">
            <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="secondary-button">Trước</button>
            <span>{currentPage + 1} / {pageCount}</span>
            <button disabled={currentPage === pageCount - 1} onClick={() => setPage(currentPage + 1)} className="secondary-button">Tiếp</button>
          </div>
        </div>
      )}
    </section>
  );
};
