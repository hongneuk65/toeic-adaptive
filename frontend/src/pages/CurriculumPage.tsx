import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader';
import { AiMarkdown } from '../components/rag/AiMarkdown';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { api, getErrorMessage } from '../lib/api';
import { notifyLearningProgress } from '../lib/learning-progress';
import type { CurriculumMinutes, CurriculumOverview, CurriculumQuestion, CurriculumResult, CurriculumUnit } from '../types/curriculum';
import '../styles/curriculum.css';

const dateLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
const questionKinds = { knowledge: 'Kiến thức', reading: 'Đọc hiểu', listening: 'Nghe hiểu', vocabulary: 'Từ vựng' };
function ResourceError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="curriculum-surface curriculum-error" role="alert"><p>{message}</p><button type="button" className="secondary-button" onClick={retry}>Thử lại</button></div>;
}
function CurriculumCatalog({ data, reload }: { data: CurriculumOverview; reload: () => void }) {
  const [trackId, setTrackId] = useState(data.enrollment?.trackId ?? data.tracks[0]?.id ?? '');
  const [minutes, setMinutes] = useState<CurriculumMinutes>(data.enrollment?.minutesPerDay ?? 30);
  const [editing, setEditing] = useState(!data.enrollment);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const savingController = useRef<AbortController | null>(null);
  useEffect(() => () => savingController.current?.abort(), []);
  const current = data.tracks.find(track => track.id === data.enrollment?.trackId);
  const selected = data.tracks.find(track => track.id === trackId);
  const save = async () => {
    if (saving || !selected) return;
    const controller = new AbortController(); savingController.current = controller;
    setSaving(true); setError('');
    try {
      await api<CurriculumOverview>('/curriculum/enroll', { method: 'POST', data: { trackId, minutesPerDay: minutes }, signal: controller.signal });
      if (!controller.signal.aborted) { setEditing(false); notifyLearningProgress(); reload(); }
    } catch (cause) { if (!controller.signal.aborted) setError(getErrorMessage(cause)); }
    finally { if (!controller.signal.aborted) setSaving(false); }
  };
  if (!data.tracks.length) return <section className="curriculum-surface"><h2>Chưa có lộ trình để chọn</h2><p>Bạn vẫn có thể học trong thư viện.</p><Link className="secondary-button" to="/theory">Mở kiến thức</Link></section>;
  return <>
    {data.enrollment && current && <section className="curriculum-surface curriculum-current" aria-label="Tiến độ lộ trình">
      <div><p className="curriculum-kicker">ĐANG HỌC</p><h2>{current.title}</h2><p>{data.enrollment.minutesPerDay} phút/ngày · {current.band}</p></div>
      <div className="curriculum-progress"><strong>{data.progress.completed}/{data.progress.total}</strong><span>bài đã qua kiểm tra</span><progress aria-label="Bài đã hoàn thành" value={data.progress.completed} max={Math.max(1, data.progress.total)} /></div>
      <button type="button" className="secondary-button" aria-expanded={editing} onClick={() => setEditing(value => !value)}>{editing ? 'Đóng điều chỉnh' : 'Điều chỉnh'}</button>
    </section>}
    {editing && <section className="curriculum-surface" aria-labelledby="curriculum-choose-title">
      <h2 id="curriculum-choose-title">Chọn chặng học</h2>
      <p className="curriculum-muted">Khoảng điểm là mục tiêu định hướng, không phải điểm dự đoán hay cam kết đầu ra.</p>
      <fieldset className="curriculum-track-options" disabled={saving}><legend className="sr-only">Lộ trình</legend>
        {data.tracks.map(track => <label className="curriculum-track-option" key={track.id} data-selected={trackId === track.id}><input type="radio" name="curriculum-track" aria-label={`${track.title} · ${track.band}`} value={track.id} checked={trackId === track.id} onChange={() => setTrackId(track.id)} /><div><span className="curriculum-band">{track.band}</span><h3>{track.title}</h3><small>{track.units.length} bài</small></div></label>)}
      </fieldset>
      {selected && <p className="curriculum-track-description" aria-live="polite">{selected.description}</p>}
      <div className="curriculum-enroll-controls"><label>Thời gian mỗi ngày<select className="form-input" disabled={saving} value={minutes} onChange={event => setMinutes(Number(event.target.value) as CurriculumMinutes)}>{([15, 30, 45, 60] as const).map(value => <option key={value} value={value}>{value} phút</option>)}</select></label><button className="primary-button" type="button" onClick={save} disabled={saving || !selected}>{saving ? 'Đang lưu…' : data.enrollment ? 'Lưu lựa chọn' : 'Bắt đầu lộ trình'}</button></div>
      <p className="curriculum-muted">Bạn có thể chia bài thành nhiều buổi; kết quả kiểm tra được lưu sau khi nộp. Đổi chặng vẫn giữ kết quả đã làm.</p>
      {error && <p role="alert" className="curriculum-error">{error}</p>}
    </section>}
    {data.enrollment && current && <>
      <section aria-labelledby="curriculum-today-title"><div className="curriculum-section-heading"><h2 id="curriculum-today-title">Hôm nay học gì?</h2>{data.progress.reviewDue > 0 ? <span>{data.progress.reviewDue} bài đến hạn ôn</span> : data.daySummary && data.daySummary.completedMinutes > 0 ? <span>Khối lượng bài đã làm: khoảng {data.daySummary.completedMinutes} phút</span> : null}</div>
        {data.today.length ? <div className="curriculum-today">{data.today.map(unit => <article className="curriculum-surface" key={unit.id}><span className="curriculum-band">{unit.reason === 'review' ? 'Đến hạn ôn' : 'Bài tiếp theo'}</span><h3>{unit.title}</h3><p>{unit.objectives[0]}</p><div className="curriculum-card-action"><span>{unit.minutes} phút dự kiến</span><Link className="primary-button" to={`/curriculum?unit=${encodeURIComponent(unit.id)}`}>{unit.reason === 'review' ? 'Ôn lại' : 'Vào học'}</Link></div></article>)}</div> : <div className="curriculum-surface"><h3>{data.progress.completed === data.progress.total ? 'Bạn đã hoàn thành các bài trong chặng' : 'Đã hoàn thành kế hoạch hôm nay'}</h3><p>{data.progress.completed < data.progress.total ? 'Bạn có thể nghỉ hoặc tự chọn học thêm bài đã mở bên dưới. Kế hoạch ngày mai sẽ tiếp tục chặng học.' : current.units.some(unit => unit.nextReviewAt) ? 'Tiếp tục duy trì lịch ôn. Bạn cũng có thể mở lại bất kỳ bài đã học.' : 'Bạn có thể học lại hoặc chọn chặng khác.'}</p></div>}
      </section>
      <section aria-labelledby="curriculum-units-title"><div className="curriculum-section-heading"><h2 id="curriculum-units-title">Nội dung chặng học</h2><span>Học kiến thức · luyện tập · kiểm tra · ôn lại</span></div><ol className="curriculum-unit-list">{current.units.map((unit, index) => <li className="curriculum-surface" key={unit.id}><span className="curriculum-unit-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span><div className="curriculum-unit-info"><h3>{unit.title}</h3><p>{unit.objectives[0]}</p><small>{unit.completed ? `Đã qua kiểm tra${unit.nextReviewAt ? ` · Ôn tiếp ${dateLabel(unit.nextReviewAt)}` : ''}` : unit.unlocked ? 'Sẵn sàng học' : 'Hoàn thành bài nền trước để mở'} · {unit.minutes} phút dự kiến</small></div>{unit.unlocked ? <Link className="secondary-button" to={`/curriculum?unit=${encodeURIComponent(unit.id)}`} aria-label={`${unit.completed ? 'Học lại' : 'Học'} ${unit.title}`}>{unit.completed ? 'Học lại' : 'Vào học'}</Link> : <span className="curriculum-locked">Chưa mở</span>}</li>)}</ol></section>
    </>}
    <details className="curriculum-surface curriculum-sources"><summary>Cơ sở lộ trình</summary><p>Đây là bộ bài học thử nghiệm được biên soạn riêng, chưa phải khóa học bao quát toàn bộ nội dung TOEIC. Cấu trúc học và ôn tham khảo tài liệu dưới đây; nội dung cần giáo viên duyệt trước khi dùng cho nghiên cứu chính thức.</p><ul>{data.researchSources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></li>)}</ul><p>Kết quả kiểm tra trong chặng chỉ phản ánh bài đã học, không quy đổi thành điểm TOEIC.</p></details>
  </>;
}
function ListeningScript({ text }: { text: string }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState('');
  const available = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  useEffect(() => () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, []);
  const play = () => {
    if (!available) return;
    window.speechSynthesis.cancel(); setError('');
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'en-US'; utterance.rate = .9;
    utterance.onend = () => setPlaying(false);
    utterance.onerror = event => { setPlaying(false); if (event.error !== 'interrupted' && event.error !== 'canceled') setError('Chưa phát được giọng đọc. Bạn có thể mở bản chép lời bên dưới.'); };
    setPlaying(true); window.speechSynthesis.speak(utterance);
  };
  return <section className="curriculum-context" aria-label="Nội dung nghe"><h3>Bài nghe</h3><p className="curriculum-muted">Giọng đọc tổng hợp của thiết bị; không phải bản thu nhiều người nói chuẩn hóa.</p><div className="curriculum-audio-controls"><button className="secondary-button" type="button" onClick={play} disabled={!available}>{playing ? 'Nghe lại từ đầu' : 'Nghe bài'}</button>{playing && <button className="secondary-button" type="button" onClick={() => { window.speechSynthesis.cancel(); setPlaying(false); }}>Dừng nghe</button>}</div>{!available && <p role="status">Trình duyệt này chưa hỗ trợ giọng đọc. Bạn có thể dùng bản chép lời để học nội dung.</p>}{error && <p role="status">{error}</p>}<details><summary>Xem bản chép lời</summary><p lang="en">{text}</p></details></section>;
}
function QuestionContext({ unit, questions }: { unit: CurriculumUnit; questions: CurriculumQuestion[] }) {
  const hasReading = questions.some(question => question.kind === 'reading');
  const longReading = unit.reading.trim().split(/\s+/).length > 150;
  return <div className="curriculum-contexts">{hasReading && (longReading ? <section className="curriculum-context" aria-label="Bài đọc"><details className="curriculum-reading-details" open><summary>Bài đọc</summary><p lang="en">{unit.reading}</p></details></section> : <section className="curriculum-context" aria-label="Bài đọc"><h3>Bài đọc</h3><p lang="en">{unit.reading}</p></section>)}{questions.some(question => question.kind === 'listening') && <ListeningScript text={unit.listening} />}</div>;
}
function QuizPanel({ unit, guided, active, onBusy }: { unit: CurriculumUnit; guided: boolean; active: boolean; onBusy: (value: boolean) => void }) {
  const questions = guided ? unit.guided : unit.checkpoint;
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<CurriculumResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const changeQuestion = (next: number) => {
    setIndex(next);
    requestAnimationFrame(() => { if (active) questionRef.current?.focus(); });
  };
  useEffect(() => () => { controller.current?.abort(); onBusy(false); }, [onBusy]);
  useEffect(() => { if (result && active) resultRef.current?.focus(); }, [result, active]);
  const complete = questions.length > 0 && questions.every(question => Number.isInteger(answers[question.id]));
  const question = questions[index];
  const submit = async () => {
    if (!complete || pending) return;
    const signature = JSON.stringify(questions.map(item => [item.id, answers[item.id]]));
    if (request.current?.signature !== signature) request.current = { signature, id: crypto.randomUUID() };
    const active = new AbortController(); controller.current = active;
    setPending(true); onBusy(true); setError('');
    try {
      const response = await api<CurriculumResult>(`/curriculum/units/${encodeURIComponent(unit.id)}/submit`, { method: 'POST', data: { requestId: request.current!.id, answers }, signal: active.signal });
      if (!active.signal.aborted) { setResult(response); notifyLearningProgress(); }
    } catch (cause) { if (!active.signal.aborted) setError(getErrorMessage(cause)); }
    finally { if (!active.signal.aborted) { setPending(false); onBusy(false); } }
  };
  if (!question) return <p>Bài tập chưa sẵn sàng. Vui lòng quay lại lộ trình.</p>;
  if (result) return <div className="curriculum-result" ref={resultRef} tabIndex={-1}><p className="curriculum-kicker">KẾT QUẢ KIỂM TRA BÀI HỌC</p><h2>{result.passed ? 'Bạn đã đạt yêu cầu bài này' : 'Cùng củng cố thêm một chút'}</h2><p><strong>{result.correct}/{result.total} câu đúng</strong> · {result.score}%</p><p>{result.passed ? result.progress.nextReviewAt ? `Kết quả đã lưu. Lần ôn tiếp theo: ${dateLabel(result.progress.nextReviewAt)}.` : 'Kết quả đã lưu. Bạn có thể tiếp tục chặng học.' : 'Xem lời giải, học lại điểm còn thiếu rồi tự kiểm tra bằng cách giải lại bài.'}</p><ol className="curriculum-result-list">{result.results.map(item => { const source = questions.find(value => value.id === item.questionId); return <li key={item.questionId}><span className="curriculum-band">{item.isCorrect ? 'Đúng' : 'Cần ôn'}</span><h3>{source?.prompt}</h3><p>Bạn chọn: {source?.options[item.selectedAnswer] ?? 'Chưa chọn'}</p><p>Đáp án: {source?.options[item.correctAnswer]}</p><p>{item.explanation}</p></li>; })}</ol><div className="curriculum-actions"><Link className="primary-button" to="/curriculum">Về lộ trình</Link><button className="secondary-button" type="button" onClick={() => { setAnswers({}); setResult(null); setIndex(0); request.current = null; }}>Làm lại kiểm tra</button></div><p className="curriculum-muted">Đây là kết quả bài học, không phải điểm TOEIC.</p></div>;
  return <div className="curriculum-quiz-layout">
    <QuestionContext key={`${active ? 'active' : 'inactive'}-${question.kind}`} unit={unit} questions={[question]} />
    <div className="curriculum-question-panel">
    <div className="curriculum-quiz-heading"><h2>{guided ? 'Luyện có hướng dẫn' : 'Tự kiểm tra'}</h2><span>Câu {index + 1}/{questions.length}</span></div>
    {!guided && <p className="curriculum-muted">Làm đủ các câu rồi nộp bài. Đúng ít nhất 80% để mở bài kế tiếp; lời giải hiện sau khi nộp.</p>}
    <div ref={questionRef} tabIndex={-1} role="group" aria-label={`Câu ${index + 1}: ${question.prompt}`}><fieldset className="curriculum-question" disabled={pending || (guided && Boolean(revealed[question.id]))}><legend><span className="curriculum-kicker">{questionKinds[question.kind]}</span>{question.prompt}</legend><div className="curriculum-options">{question.options.map((option, answer) => <label key={`${question.id}-${answer}`} data-selected={answers[question.id] === answer}><input type="radio" name={`curriculum-${question.id}`} checked={answers[question.id] === answer} onChange={() => { setAnswers(value => ({ ...value, [question.id]: answer })); setError(''); }} /><span>{option}</span></label>)}</div></fieldset></div>
    {guided && !revealed[question.id] && <button className="primary-button" type="button" disabled={!Number.isInteger(answers[question.id])} onClick={() => setRevealed(value => ({ ...value, [question.id]: true }))}>Xem giải thích</button>}
    {guided && revealed[question.id] && <div className="curriculum-feedback" role="status"><strong>{answers[question.id] === question.answer ? 'Đúng rồi.' : 'Cùng xem lại.'}</strong><p>Đáp án: {question.options[question.answer ?? 0]}</p><p>{question.explanation}</p></div>}
    <div className="curriculum-quiz-navigation"><button className="secondary-button" type="button" disabled={index === 0 || pending} onClick={() => changeQuestion(index - 1)}>Câu trước</button><span>{Object.keys(answers).length}/{questions.length} câu đã chọn</span><button className="secondary-button" type="button" disabled={index === questions.length - 1 || pending || (guided && !revealed[question.id])} onClick={() => changeQuestion(index + 1)}>Câu tiếp</button></div>
    {!guided && <div className="curriculum-submit"><button className="primary-button" type="button" disabled={!complete || pending} onClick={submit}>{pending ? 'Đang lưu kết quả…' : 'Nộp bài kiểm tra'}</button>{!complete && <p className="curriculum-muted">Cần trả lời đủ {questions.length} câu để nộp.</p>}{error && <p role="alert" className="curriculum-error">{error} Câu trả lời của bạn vẫn được giữ; hãy thử nộp lại.</p>}</div>}
    </div>
  </div>;
}
function UnitLesson({ unit }: { unit: CurriculumUnit }) {
  const [phase, setPhase] = useState<'knowledge' | 'guided' | 'checkpoint'>('knowledge');
  const [busy, setBusy] = useState(false);
  const onBusy = useCallback((value: boolean) => setBusy(value), []);
  useEffect(() => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }, [phase]);
  return <>
    <PageHeader title={unit.title} variant="compact" actions={<Link className="secondary-button" to="/curriculum">Về lộ trình</Link>} />
    <nav className="curriculum-phases" aria-label="Các bước bài học">{([['knowledge', '1. Học kiến thức'], ['guided', '2. Luyện có hướng dẫn'], ['checkpoint', '3. Tự kiểm tra']] as const).map(([value, label]) => <button key={value} type="button" aria-current={phase === value ? 'step' : undefined} disabled={busy} onClick={() => setPhase(value)}>{label}</button>)}</nav>
    <section className="curriculum-surface curriculum-lesson" aria-label={phase === 'knowledge' ? 'Kiến thức bài học' : phase === 'guided' ? 'Bài luyện có hướng dẫn' : 'Bài kiểm tra'}>
      <div hidden={phase !== 'knowledge'}><div className="curriculum-lesson-meta"><span>{unit.minutes} phút dự kiến cho cả bài</span>{unit.access.completed && <span>Đã qua kiểm tra</span>}</div><section className="curriculum-objectives"><h2>Sau bài này, bạn có thể</h2><ul>{unit.objectives.map(value => <li key={value}>{value}</li>)}</ul></section><div className="curriculum-knowledge"><AiMarkdown content={unit.knowledge} /></div><section className="curriculum-worked"><h2>Ví dụ có giải thích</h2>{unit.examples.map((example, index) => <article key={index}><p lang="en"><strong>{example.prompt}</strong></p><p>{example.explanation}</p></article>)}</section><section className="curriculum-vocabulary"><h2>Từ vựng trong bài</h2><dl>{unit.vocabulary.map(item => <div key={item.word}><dt lang="en">{item.word}</dt><dd>{item.meaning}<p lang="en">{item.example}</p></dd></div>)}</dl></section><div className="curriculum-actions"><button className="primary-button" type="button" onClick={() => setPhase('guided')}>Bắt đầu luyện tập</button></div></div>
      <div hidden={phase !== 'guided'}><QuizPanel unit={unit} guided active={phase === 'guided'} onBusy={onBusy} /></div>
      <div hidden={phase !== 'checkpoint'}><QuizPanel unit={unit} guided={false} active={phase === 'checkpoint'} onBusy={onBusy} /></div>
    </section>
    {phase === 'guided' && <div className="curriculum-actions"><button className="primary-button" type="button" onClick={() => setPhase('checkpoint')}>Chuyển sang tự kiểm tra</button></div>}
  </>;
}
function CurriculumLessonLoader({ unitId }: { unitId: string }) {
  const load = useCallback((signal: AbortSignal) => api<CurriculumUnit>(`/curriculum/units/${encodeURIComponent(unitId)}`, { signal }), [unitId]);
  const resource = useAsyncResource(load);
  if (resource.error) return <><PageHeader title="Bài học" variant="compact" actions={<Link className="secondary-button" to="/curriculum">Về lộ trình</Link>} /><ResourceError message={resource.error} retry={resource.reload} /></>;
  if (!resource.data) return <p role="status" className="curriculum-surface">Đang mở bài học…</p>;
  return <UnitLesson unit={resource.data} key={resource.data.id} />;
}
function CurriculumOverviewLoader() {
  const load = useCallback((signal: AbortSignal) => api<CurriculumOverview>('/curriculum', { signal }), []);
  const resource = useAsyncResource(load);
  return <><PageHeader title="Lộ trình học" variant="compact" actions={<Link className="secondary-button" to="/placement">Kiểm tra đầu vào</Link>} />{resource.error ? <ResourceError message={resource.error} retry={resource.reload} /> : !resource.data ? <p role="status" className="curriculum-surface">Đang tải lộ trình…</p> : <CurriculumCatalog key={`${resource.data.enrollment?.trackId ?? 'new'}-${resource.data.enrollment?.minutesPerDay ?? 30}`} data={resource.data} reload={resource.reload} />}</>;
}
export function CurriculumPage() {
  const [params] = useSearchParams();
  const unitId = params.get('unit');
  return <div className="page-stack curriculum-page">{unitId ? <CurriculumLessonLoader unitId={unitId} /> : <CurriculumOverviewLoader />}</div>;
}
