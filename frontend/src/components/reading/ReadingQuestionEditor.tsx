import type { ReadingQuestion } from '../../types/reading';

const types: Record<string, string> = { MAIN: 'Ý chính', DETAIL: 'Chi tiết', INFERENCE: 'Suy luận', PURPOSE: 'Mục đích', PARAPHRASE: 'Diễn đạt tương đương' };

export function ReadingQuestionEditor({ value, text, onChange, sourceOrder = false }: { value: string; text: string; onChange(value: string): void; sourceOrder?: boolean }) {
  let questions: ReadingQuestion[];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every(q => q && typeof q === 'object' && typeof q.prompt === 'string' && Array.isArray(q.options) && q.options.length === 4 && q.options.every((option: unknown) => typeof option === 'string'))) throw new Error('Invalid questions');
    questions = parsed;
  } catch {
    return <p role="alert" className="text-sm text-rose-800">JSON chưa đúng cấu trúc. Mở mục Nâng cao để sửa hoặc tải lại bài đã lưu.</p>;
  }
  const save = (next: ReadingQuestion[]) => onChange(JSON.stringify(next, null, 2));
  const update = (index: number, patch: Partial<ReadingQuestion>) => save(questions.map((q, i) => i === index ? { ...q, ...patch } : q));
  return <section className="space-y-4" aria-label="Biên soạn câu hỏi Reading">
    <h3 className="section-title">Câu hỏi và đáp án</h3>
    {!questions.length && <p className="text-sm text-ink-medium">Thêm câu ý chính trước, hoặc dùng AI hỗ trợ bản nháp.</p>}
    {questions.map((q, index) => <fieldset key={index} className="space-y-3 border-t border-paper-kraft/50 pt-4">
      <legend className="px-1 font-semibold">Câu {index + 1}</legend>
      <label className="block">Dạng câu<select className="form-input mt-1" value={q.type} disabled={index === 0 && !sourceOrder} onChange={event => update(index, { type: event.target.value })}>{Object.entries(types).map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label>
      <label className="block">Câu hỏi<textarea className="form-input mt-1" rows={2} value={q.prompt} onChange={event => update(index, { prompt: event.target.value })} /></label>
      <div className="grid gap-3 sm:grid-cols-2">{q.options.map((option, optionIndex) => <label key={optionIndex} className="block">Lựa chọn {String.fromCharCode(65 + optionIndex)}<input className="form-input mt-1" value={option} onChange={event => update(index, { options: q.options.map((old, i) => i === optionIndex ? event.target.value : old) })} /></label>)}</div>
      <label className="block">Đáp án đúng<select className="form-input mt-1 sm:max-w-xs" value={q.answer ?? 0} onChange={event => update(index, { answer: Number(event.target.value) })}>{q.options.map((_, i) => <option key={i} value={i}>{String.fromCharCode(65 + i)}</option>)}</select></label>
      <label className="block">Lời giải<textarea className="form-input mt-1" rows={3} value={q.explanation || ''} onChange={event => update(index, { explanation: event.target.value })} /></label>
      <label className="flex items-center gap-2"><input type="checkbox" checked={q.evidenceRequired} onChange={event => update(index, { evidenceRequired: event.target.checked })} />Yêu cầu người học chọn dẫn chứng</label>
      {(q.evidence?.length ? q.evidence : [{ text: '', start: 0, end: 0 }]).map((evidence, evidenceIndex) => <label key={evidenceIndex} className="block">Dẫn chứng {evidenceIndex + 1} trong văn bản gốc<textarea className="form-input mt-1" rows={2} value={evidence.text} onChange={event => {
        const quote = event.target.value;
        if (!quote && !q.evidenceRequired) { update(index, { evidence: [] }); return; }
        const position = quote ? text.indexOf(quote) : -1;
        const next = { text: quote, start: Math.max(0, position), end: Math.max(0, position) + quote.length };
        const evidenceList = q.evidence?.length ? q.evidence : [next];
        update(index, { evidence: evidenceList.map((old, i) => i === evidenceIndex ? next : old) });
      }} />{evidence.text && text.indexOf(evidence.text) < 0 && <span className="mt-1 block text-sm text-rose-800">Đoạn này không khớp văn bản gốc. Hãy sao chép đúng đoạn dẫn chứng.</span>}{evidence.text && text.indexOf(evidence.text) !== text.lastIndexOf(evidence.text) && <span className="mt-1 block text-sm text-ink-medium">Đoạn xuất hiện nhiều lần; kiểm tra vị trí trong mục JSON nâng cao.</span>}</label>)}
      <button type="button" disabled={index === 0 && questions.length > 1} className="text-sm text-rose-800 underline disabled:opacity-50" onClick={() => save(questions.filter((_, i) => i !== index))}>Bỏ câu {index + 1} khỏi bản nháp</button>
    </fieldset>)}
    <button type="button" className="secondary-button" disabled={questions.length >= 5} onClick={() => save([...questions, { type: questions.length ? 'DETAIL' : 'MAIN', prompt: '', options: ['', '', '', ''], answer: 0, explanation: '', evidenceRequired: true, evidence: [] }])}>Thêm câu hỏi</button>
  </section>;
}
