import React from 'react';
import { DuckMascot } from '../mascot/DuckMascot';
import './tutor-duck.css';

interface AiTutorFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AiTutorFloatingButton: React.FC<AiTutorFloatingButtonProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button type="button" onClick={onClick} aria-label="Mở Gia sư AI" className="tutor-duck-launcher">
      <span className="tutor-duck-launcher-label" aria-hidden="true">Gia sư AI</span>
      <span className="tutor-duck-launcher-avatar"><DuckMascot motion="interactive" /></span>
    </button>
  );
};
