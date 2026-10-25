import type { RefObject } from 'react';
interface Props { mode: 'reading' | 'personal' | 'clauses'; onReading(): void; onClauses(): void; onPersonal(): void; personalTrigger: RefObject<HTMLButtonElement | null> }

export function ReadingModes({ mode, onReading, onClauses, onPersonal, personalTrigger }: Props) {
  const choice = 'min-w-0 rounded-xl border p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-navy sm:p-5';
  return <section aria-label="Chọn cách luyện đọc" className="space-y-3">
    <div className="grid gap-3 sm:grid-cols-2">
      <button type="button" aria-pressed={mode !== 'clauses'} onClick={onReading} className={`${choice} ${mode !== 'clauses' ? 'border-accent-navy bg-paper-sky' : 'border-paper-kraft bg-paper-white hover:bg-paper-cream'}`}><span className="block text-lg font-semibold">Đọc hiểu</span><span className="mt-2 block text-sm leading-6 text-ink-medium">Đọc đoạn văn, trả lời câu hỏi và tìm bằng chứng.</span></button>
      <button type="button" aria-pressed={mode === 'clauses'} onClick={onClauses} className={`${choice} ${mode === 'clauses' ? 'border-accent-navy bg-paper-sky' : 'border-paper-kraft bg-paper-white hover:bg-paper-cream'}`}><span className="block text-lg font-semibold">Tìm mệnh đề chính</span><span className="mt-2 block text-sm leading-6 text-ink-medium">Xác định chủ ngữ, động từ chính và tách mệnh đề phụ.</span></button>
    </div>
    <button ref={personalTrigger} type="button" onClick={onPersonal} aria-expanded={mode === 'personal'} aria-controls={mode === 'clauses' ? undefined : 'personal-reading-form'} className="min-h-11 text-sm font-semibold text-accent-navy underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4">Tạo bài từ văn bản của bạn</button>
  </section>;
}
