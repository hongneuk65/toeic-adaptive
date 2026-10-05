import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { SkillMasteryItem } from '../../types/mastery';

interface Props {
  skill: SkillMasteryItem;
  onStartPractice: (skill: SkillMasteryItem) => void;
}

export const SkillRow: React.FC<Props> = ({ skill, onStartPractice }) => {
  const navigate = useNavigate();

  const practiced = skill.practiceCount > 0;
  const score = Math.round(skill.masteryScore * 100);
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-paper-cream/60 sm:px-5">
      <span className="shrink-0 rounded border border-paper-kraft bg-paper-cream px-2 py-1 font-mono text-xs text-ink-medium">P{skill.part}</span>
      <div className="min-w-0 flex-1 basis-40">
        <h3 className="text-sm font-semibold leading-snug text-ink-dark">{skill.skillName}</h3>
        <p className="mt-1 text-xs text-ink-light">{practiced ? `${skill.practiceCount} câu đã luyện` : 'Chưa luyện · mức ước tính ban đầu'}</p>
      </div>
      <div className="w-16 shrink-0 text-right" title="Độ thông thạo ước tính">
        <span className="text-sm font-semibold text-ink-medium">{score}%</span>
        <div className="mt-1 h-1 overflow-hidden rounded bg-paper-kraft/40">
          <div className={`h-full rounded ${skill.masteryScore < .6 ? 'bg-accent-coral/70' : 'bg-accent-sage'}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button onClick={() => navigate('/theory')} className="rounded px-2 py-2 text-xs text-ink-medium hover:bg-paper-cream hover:text-ink-dark">Lý thuyết</button>
        <button onClick={() => onStartPractice(skill)} className="rounded border border-paper-kraft bg-paper-cream px-3 py-2 text-xs font-semibold text-ink-dark hover:bg-paper-kraft-light/60">Luyện tập</button>
      </div>
    </div>
  );
};
