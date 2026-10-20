import { useState, type ReactNode, type CSSProperties } from 'react';
import { ExamStimulus } from '../exam/ExamStimulus';
import type { ExamStimulus as SourceStimulus } from '../../types/exam';
import '../../styles/exam-room.css';

export function ReadingSourceDocument({ stimulus, children, fontSize = 18 }: { stimulus?: SourceStimulus | null; children: ReactNode; fontSize?: number }) {
  const [plain, setPlain] = useState(false);
  if (!stimulus?.documents?.length) return children;
  return <div className="space-y-4" style={{'--reading-document-size': `${fontSize}px`} as CSSProperties}>
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-paper-cream p-3 text-sm">
      <span>{stimulus.documents.length} tài liệu gốc · giữ bố cục bảng và hình</span>
      <button className="text-action" aria-pressed={plain} onClick={() => setPlain(value => !value)}>{plain ? 'Xem bố cục tài liệu' : 'Văn bản để bôi chọn / lưu từ'}</button>
    </div>
    {plain ? children : <ExamStimulus question={{ id: 0, part: 7, content: '', optionA: '', optionB: '', optionC: '', optionD: '', stimulus }} blankNumbers={{}} />}
  </div>;
}
