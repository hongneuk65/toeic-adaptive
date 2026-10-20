import { useEffect, useRef, useState } from 'react';
import { PageHeader } from '../ui/PageHeader';
import { clauseExercises, clauseScore } from '../../lib/reading-clauses';

export function ReadingClausePractice({ onLibrary }: { onLibrary(): void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [finished, setFinished] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const exercise = clauseExercises[index];
  const checked = answers[index] !== undefined;
  const correct = selected === exercise.answer;
  const score = clauseScore(answers);
  useEffect(() => { heading.current?.focus(); }, [index, finished]);
  const reset = () => { setIndex(0); setSelected(null); setAnswers([]); setFinished(false); };

  return <div className="page-stack mx-auto w-full max-w-4xl">
    <PageHeader variant="compact" eyebrow="READING · CẤU TRÚC CÂU" title="Tìm mệnh đề chính" description="Tách phần phụ để nhận ra chủ ngữ và động từ chính trong câu nhiều mệnh đề." actions={<button className="secondary-button" onClick={onLibrary}>Thư viện bài đọc</button>} />
    {finished ? <section className="space-y-6 rounded-2xl border border-paper-kraft bg-paper-white p-6 sm:p-8"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-navy">Đã hoàn thành</p><h2 ref={heading} tabIndex={-1} className="mt-3 text-2xl font-semibold text-ink-dark">Bạn xác định đúng {score} / {clauseExercises.length} câu</h2><p className="mt-3 text-sm leading-7 text-ink-medium">Tìm từ nối phụ thuộc trước, sau đó kiểm tra phần còn lại có chủ ngữ và cụm động từ hoàn chỉnh. Với mệnh đề quan hệ, thử lược phần bổ nghĩa rồi đọc lại câu.</p></div><div className="flex flex-wrap gap-3"><button className="primary-button" onClick={reset}>Luyện lại 12 câu</button><button className="secondary-button" onClick={onLibrary}>Áp dụng vào bài đọc</button></div></section> : <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-kraft pb-4"><p className="text-sm font-semibold text-ink-dark">Câu {index + 1} / {clauseExercises.length}</p><p role="status" className="text-sm text-ink-medium">Đúng {score} / {answers.length} câu đã kiểm tra</p></div>
      <section className="overflow-hidden rounded-2xl border border-paper-kraft bg-paper-white">
        <div className="border-b border-paper-kraft bg-paper-sky p-6 sm:p-8"><p className="text-xs font-semibold uppercase tracking-wider text-accent-navy">Đọc toàn bộ câu</p><h2 ref={heading} tabIndex={-1} className="mt-4 text-xl font-semibold leading-relaxed text-ink-dark sm:text-2xl">{exercise.sentence}</h2></div>
        <div className="space-y-6 p-6 sm:p-8"><fieldset disabled={checked} className="min-w-0 space-y-3"><legend className="mb-4 text-sm font-semibold text-ink-dark">Đâu là mệnh đề chính? Với câu có mệnh đề quan hệ, chọn phần cốt lõi đã lược phần bổ nghĩa.</legend>{exercise.options.map((option, optionIndex) => <label key={optionIndex} className={`flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-7 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-navy ${checked && optionIndex===exercise.answer ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : checked && selected===optionIndex ? 'border-rose-300 bg-rose-50 text-rose-900' : selected===optionIndex ? 'border-accent-navy bg-paper-sky text-ink-dark' : 'border-paper-kraft text-ink-dark hover:bg-paper-cream'}`}><input className="mt-1.5 shrink-0 accent-blue-600" type="radio" name={`clause-${exercise.id}`} checked={selected===optionIndex} onChange={() => setSelected(optionIndex)} /><span className="min-w-0 break-words"><strong className="mr-2">{String.fromCharCode(65+optionIndex)}.</strong>{option}{checked && optionIndex===exercise.answer && <span className="block text-xs font-semibold">Mệnh đề chính</span>}{checked && selected===optionIndex && !correct && <span className="block text-xs font-semibold">Bạn đã chọn</span>}</span></label>)}</fieldset>
        {checked && <section role="status" className="space-y-4 rounded-xl border border-paper-kraft bg-paper-cream p-5"><h3 className={`font-semibold ${correct ? 'text-emerald-800' : 'text-ink-dark'}`}>{correct ? 'Chính xác. Bạn đã tìm đúng phần chính.' : 'Hãy đối chiếu chủ ngữ và động từ.'}</h3><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-ink-medium">Chủ ngữ chính</dt><dd className="mt-1 font-semibold text-accent-navy">{exercise.subject}</dd></div><div><dt className="text-xs font-semibold text-ink-medium">Động từ / cụm động từ chính</dt><dd className="mt-1 font-semibold text-accent-navy">{exercise.verb}</dd></div></dl><p className="text-sm leading-7 text-ink-medium">{exercise.explanation}</p></section>}
        <div className="flex flex-wrap items-center justify-between gap-3">{checked ? <button className="primary-button" onClick={() => { if(index+1===clauseExercises.length) setFinished(true); else {setIndex(value => value+1);setSelected(null);} }}>{index+1===clauseExercises.length ? 'Xem kết quả' : 'Câu tiếp theo'}</button> : <button disabled={selected===null} className="primary-button" onClick={() => setAnswers(values => [...values, selected])}>Kiểm tra mệnh đề</button>}<button className="text-action text-sm" onClick={reset}>Làm lại từ đầu</button></div></div>
      </section>
    </>}
    <p className="text-xs leading-6 text-ink-medium">12 câu mẫu chủ đề công việc được biên soạn cho bài luyện này. Bài tập chạy trên trình duyệt, không dùng AI phân tích câu; kết quả không được lưu vào điểm thi hay hồ sơ kỹ năng.</p>
  </div>;
}
