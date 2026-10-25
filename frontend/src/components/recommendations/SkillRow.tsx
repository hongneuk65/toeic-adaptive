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
  return (
    <div className="skill-row">
      <span className="shrink-0 rounded border border-paper-kraft bg-paper-cream px-2 py-1 font-mono text-xs text-ink-medium">P{skill.part}</span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold leading-snug text-ink-dark">{skill.skillName}</h3>
        <p className="mt-1 text-sm text-ink-medium">{practiced ? `${skill.practiceCount} lượt trả lời` : 'Chưa luyện'}</p>
      </div>
      <div className="skill-row-actions">
        <button onClick={() => navigate('/theory')} className="min-h-11 px-1 text-sm text-ink-medium underline underline-offset-4 hover:text-ink-dark">Kiến thức</button>
        <button onClick={() => onStartPractice(skill)} className="secondary-button">Luyện tập</button>
      </div>
    </div>
  );
};
