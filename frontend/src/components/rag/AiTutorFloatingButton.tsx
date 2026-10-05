import React from 'react';

interface AiTutorFloatingButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const AiTutorFloatingButton: React.FC<AiTutorFloatingButtonProps> = ({
  onClick,
  isOpen,
}) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      aria-label="Mở Trợ lý AI Hỏi đáp TOEIC"
      className="fixed bottom-6 right-6 z-40 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-paper-heavy border-2 border-paper-kraft hover:scale-102 active:scale-98 transition-all flex items-center gap-2"
    >
      
      <span className="font-hand font-bold text-sm tracking-wide">Trợ Lý AI Tutor</span>
    </button>
  );
};
