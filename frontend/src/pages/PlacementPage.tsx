import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { notifyLearningProgress } from '../lib/learning-progress';
import { ExamListeningAudio } from '../components/exam/ExamListeningAudio';
import { ExamStimulus } from '../components/exam/ExamStimulus';
import type { LearningGoal, PlacementOverview, PlacementPreferences, PlacementSession } from '../types/placement';
import '../styles/exam-room.css';
import '../styles/placement.css';

const goals: { value: LearningGoal; title: string; detail: string }[] = [
  { value: 'FOUNDATION', title: 'Củng cố nền tảng', detail: 'Ưu tiên kiến thức và bài luyện dễ tiếp cận.' },
  { value: 'BALANCED', title: 'Học cân bằng', detail: 'Kết hợp củng cố và thử sức với nội dung mới.' },
  { value: 'CHALLENGE', title: 'Tăng thử thách', detail: 'Sẵn sàng luyện nội dung khó hơn khi phù hợp.' },
];
const statusLabels = { 'needs-practice': 'Cần củng cố', promising: 'Tín hiệu ban đầu tích cực', insufficient: 'Chưa đủ dữ liệu' };

export function PlacementPage() {
  const load = useCallback((signal: AbortSignal) => api<PlacementOverview>('/placement/overview', { signal }), []);
  const overview = useAsyncResource(load);
  if (overview.loading) return <p role="status" className="placement-state">Đang chuẩn bị đánh giá đầu vào…</p>;
  if (!overview.data) return <div role="alert" className="placement-state"><p>{overview.error || 'Chưa tải được bài đánh giá.'}</p><button className="secondary-button" onClick={overview.reload}>Thử lại</button></div>;
  return <PlacementWorkspace initial={overview.data} />;
}

function PlacementWorkspace({ initial }: { initial: PlacementOverview }) {
  const [session, setSession] = useState(initial.active);
  const [preferences, setPreferences] = useState<PlacementPreferences>(initial.preferences);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const acceptSession = useCallback((value: PlacementSession) => {
    if (!mounted.current) return;
    setSession(value);
    if (value.status === 'COMPLETED') notifyLearningProgress();
  }, []);
  const run = async (operation: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError(''); setNotice('');
    try { await operation(); }
    catch (cause) { if (mounted.current) setError(getErrorMessage(cause)); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  const savePreferences = () => run(async () => {
    const value = await api<PlacementPreferences>('/placement/preferences', { method: 'PATCH', data: preferences });
    if (mounted.current) { setPreferences(value); setSaved(true); }
  });
  const start = () => run(async () => {
    const value = await api<PlacementSession>('/placement/start', { method: 'POST', data: preferences });
    acceptSession(value);
  });
  const refreshSession = useCallback(async (id: number) => {
    try { acceptSession(await api<PlacementSession>(`/placement/${id}`)); }
    catch (cause) { if (mounted.current) setError(getErrorMessage(cause)); }
  }, [acceptSession]);
  const answer = (answers: { questionId: number; selectedAnswer: string }[]) => run(async () => {
    if (!session || session.status !== 'ACTIVE') return;
    try {
      acceptSession(await api<PlacementSession>(`/placement/${session.id}/answer`, { method: 'POST', data: { revision: session.revision, answers } }));
    } catch (cause) {
      setReconciling(true);
      try {
        const current = await api<PlacementSession>(`/placement/${session.id}`);
        acceptSession(current);
        if (current.revision !== session.revision || current.status !== 'ACTIVE') {
          setNotice('Đã tải trạng thái mới nhất từ máy chủ. Phần trả lời đã được xử lý sẽ không gửi lại.');
          return;
        }
      } catch { /* Keep the draft until the server can be reached. */ }
      finally { if (mounted.current) setReconciling(false); }
      throw cause;
    }
  });
  const visibleResult = session?.result ? session : !session ? initial.latest : null;
  return <div className="placement-page">
    <header className="placement-header"><div><p className="placement-kicker">BẮT ĐẦU TỪ ĐÚNG CHỖ</p><h1>Đánh giá đầu vào</h1><p>Câu hỏi điều chỉnh theo kết quả để tìm những nội dung bạn nên học trước.</p></div><Link to="/exam">Về bài luyện</Link></header>
    <p className="placement-method">Đánh giá sơ bộ theo quy tắc thích ứng, chưa phải bài CAT dùng IRT đã hiệu chỉnh. Kết quả không quy đổi thành điểm TOEIC hoặc CEFR.</p>
    {error && <div role="alert" className="placement-alert">{error}</div>}
    {notice && <p role="status" className="placement-notice">{notice}</p>}
    {reconciling && <p role="status">Đang kiểm tra xem máy chủ đã nhận đáp án chưa…</p>}
    {session?.status === 'ACTIVE' ? <PlacementRunner key={`${session.id}:${session.revision}`} session={session} busy={busy} onAnswer={answer} onExpire={refreshSession} /> : <>
      {session?.status === 'EXPIRED' && <p role="status" className="placement-alert">Lượt đánh giá đã hết thời gian. Các phần đã trả lời được giữ lại; câu chưa trả lời không bị tự tính sai.</p>}
      {visibleResult && <PlacementResults session={visibleResult} busy={busy} onRefresh={() => void run(async () => { await refreshSession(visibleResult.id); })} />}
      <section className="placement-setup" aria-labelledby="placement-goal-title"><h2 id="placement-goal-title">Bạn muốn học theo hướng nào?</h2><p>Mục tiêu học được lưu riêng và không thay đổi kết quả đánh giá năng lực của bạn.</p>
        <fieldset className="placement-goals" disabled={busy}><legend className="sr-only">Hướng học mong muốn</legend>{goals.map(goal => <label key={goal.value} data-selected={preferences.goal === goal.value || undefined}><input type="radio" name="learning-goal" value={goal.value} checked={preferences.goal === goal.value} onChange={() => { setPreferences({ ...preferences, goal: goal.value }); setSaved(false); }} /><span><strong>{goal.title}</strong><small>{goal.detail}</small></span></label>)}</fieldset>
        <label className="placement-target">Điểm TOEIC mục tiêu — không bắt buộc<input type="number" min={10} max={990} step={5} value={preferences.targetScore ?? ''} disabled={busy} onChange={event => { setPreferences({ ...preferences, targetScore: event.target.value === '' ? null : Number(event.target.value) }); setSaved(false); }} aria-describedby="placement-target-help" /></label><p id="placement-target-help" className="placement-muted">Đây là mục tiêu bạn tự đặt, không phải điểm hệ thống dự đoán hoặc xác nhận.</p>
        <div className="placement-actions"><button className="secondary-button" disabled={busy || !validPreferences(preferences)} onClick={savePreferences}>{busy ? 'Đang xử lý…' : 'Lưu mục tiêu học'}</button>{saved && <span role="status">Đã lưu mục tiêu.</span>}</div>
        <div className="placement-test-info"><h3>Bài đánh giá diễn ra thế nào?</h3><ul><li>Khoảng 30–42 câu, tối đa 40 phút; giữ nguyên các nhóm hội thoại và bài đọc.</li><li>Độ khó được điều chỉnh theo kết quả, đồng thời kiểm tra nhiều nhóm kỹ năng.</li><li>Các lượt ưu tiên câu khác nhau; mức trùng còn phụ thuộc ngân hàng câu hỏi.</li><li>Không có gợi ý hay đáp án trong lúc làm bài. Phần nghe được phát một lần.</li></ul></div>
        {!initial.catalog.available && <p role="status" className="placement-alert">{initial.catalog.reason || 'Ngân hàng chưa đủ câu phù hợp để mở bài đánh giá.'}</p>}
        {initial.catalog.adaptiveParts && <p className="placement-muted">Hiện có thể điều chỉnh độ khó ở Part {initial.catalog.adaptiveParts.join(', ')}. Các Part còn lại dùng để khảo sát ban đầu; chưa đủ bằng chứng để điều chỉnh độ khó.</p>}
        <button className="primary-button" disabled={busy || !initial.catalog.available || !validPreferences(preferences)} onClick={start}>{busy ? 'Đang chuẩn bị…' : session ? 'Bắt đầu lượt đánh giá mới' : 'Bắt đầu đánh giá'}</button>
      </section>
    </>}
  </div>;
}

function validPreferences(value: PlacementPreferences) { return value.targetScore === null || Number.isInteger(value.targetScore) && value.targetScore >= 10 && value.targetScore <= 990 && value.targetScore % 5 === 0; }
function formatRemaining(seconds: number) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
function draftKey(session: PlacementSession) { return `placement-draft:${session.id}:${session.revision}`; }
function readDraft(session: PlacementSession): Record<number, string> {
  try {
    const stored: unknown = JSON.parse(sessionStorage.getItem(draftKey(session)) || '{}');
    if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return {};
    const allowed = new Set(session.currentGroup?.questions.map(q => q.id));
    return Object.fromEntries(Object.entries(stored).filter(([id, answer]) => allowed.has(Number(id)) && typeof answer === 'string' && /^[ABCD]$/.test(answer)));
  } catch { return {}; }
}

function PlacementRunner({ session, busy, onAnswer, onExpire }: { session: PlacementSession; busy: boolean; onAnswer: (answers: { questionId: number; selectedAnswer: string }[]) => Promise<void>; onExpire: (id: number) => Promise<void> }) {
  const group = session.currentGroup;
  const [answers, setAnswers] = useState<Record<number, string>>(() => readDraft(session));
  const [audioComplete, setAudioComplete] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const remaining = () => Math.max(0, Math.ceil((Date.parse(session.deadlineAt) - Date.now()) / 1000));
  const [timeLeft, setTimeLeft] = useState(remaining);
  const expiredRequested = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => { const timer = window.setInterval(() => setTimeLeft(Math.max(0, Math.ceil((Date.parse(session.deadlineAt) - Date.now()) / 1000))), 500); return () => window.clearInterval(timer); }, [session.deadlineAt]);
  useEffect(() => { if (timeLeft <= 0 && !expiredRequested.current) { expiredRequested.current = true; void onExpire(session.id); } }, [timeLeft, onExpire, session.id]);
  if (timeLeft <= 0) return <section className="placement-state"><h2>Đã hết thời gian đánh giá</h2><p>Câu chưa trả lời không bị tự ghi thành đáp án sai.</p><button className="secondary-button" onClick={() => void onExpire(session.id)}>Tải kết quả đã lưu</button></section>;
  if (!group?.questions.length) return <section role="alert" className="placement-state"><p>Máy chủ chưa cung cấp nhóm câu tiếp theo.</p><button onClick={() => void onExpire(session.id)}>Tải lại trạng thái</button></section>;
  const first = group.questions[0];
  const listening = group.part <= 4;
  const ready = group.questions.every(q => answers[q.id]) && (!listening || audioComplete);
  const select = (id: number, answer: string) => {
    const next = { ...answers, [id]: answer }; setAnswers(next);
    try { sessionStorage.setItem(draftKey(session), JSON.stringify(next)); } catch { setStorageError(true); }
  };
  const blankNumbers = Object.fromEntries(group.questions.map((q, index) => [q.stimulus?.questionPosition ?? index + 1, session.answeredCount + index + 1]));
  return <section className="placement-runner" aria-labelledby="placement-current-title">
    <div className="placement-progress"><p>Đã trả lời <strong>{session.answeredCount}</strong> · Tối đa {session.maxQuestions} câu</p><span aria-label="Thời gian còn lại">Còn {formatRemaining(timeLeft)}</span></div>
    <h2 id="placement-current-title" ref={heading} tabIndex={-1}>Part {group.part} · Câu {session.answeredCount + 1}{group.questions.length > 1 ? `–${session.answeredCount + group.questions.length}` : ''}</h2>
    {storageError && <p role="alert">Trình duyệt không lưu được bản nháp. Hãy giữ trang mở cho đến khi gửi phần trả lời.</p>}
    <div className="placement-question-layout"><div className="placement-material">
      {listening ? <>{first.audioUrl ? <ExamListeningAudio attemptId={session.id} groupKey={`placement-${group.key}`} src={first.audioUrl} restSeconds={group.restSeconds} disabled={busy} onComplete={() => setAudioComplete(true)} /> : <p role="alert">Nhóm câu thiếu audio. Chưa thể gửi phần nghe; hãy tải lại trang hoặc báo lỗi nguồn bài.</p>}{first.imageUrl && <img className="exam-source-image" src={first.imageUrl} alt="Hình ảnh của bài nghe" />}{first.stimulus?.documents.length ? <ExamStimulus question={first} blankNumbers={blankNumbers} /> : null}</> : <ExamStimulus question={first} blankNumbers={blankNumbers} />}
    </div><div className="placement-questions">{group.questions.map((q, index) => <fieldset key={q.id} disabled={busy} className="placement-question"><legend>Câu {session.answeredCount + index + 1}{group.part !== 2 ? ` · ${q.content}` : ' · Nghe và chọn phản hồi phù hợp'}</legend>{(['A', 'B', 'C', 'D'] as const).filter(letter => !(group.part === 2 && letter === 'D')).map(letter => <label key={letter} data-selected={answers[q.id] === letter || undefined}><input type="radio" name={`placement-question-${q.id}`} value={letter} checked={answers[q.id] === letter} onChange={() => select(q.id, letter)} /><span><strong>{letter}</strong>{' '}{group.part <= 2 ? '' : q[`option${letter}`]}</span></label>)}</fieldset>)}</div></div>
    <div className="placement-submit"><p>{listening && !audioComplete ? 'Nghe hết audio và chờ hết thời gian trả lời để tiếp tục.' : 'Đáp án được khóa khi gửi. Nhóm tiếp theo sẽ được chọn theo kết quả của bạn.'}</p><button className="primary-button" disabled={busy || !ready} onClick={() => void onAnswer(group.questions.map(q => ({ questionId: q.id, selectedAnswer: answers[q.id] })))}>{busy ? 'Đang gửi…' : 'Gửi và tiếp tục'}</button></div>
  </section>;
}

function PlacementResults({ session, busy, onRefresh }: { session: PlacementSession; busy: boolean; onRefresh: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [session.id, session.status]);
  const result = session.result;
  if (!result) return null;
  return <section className="placement-results" aria-labelledby="placement-result-title"><p className="placement-kicker">HỒ SƠ KHỞI ĐẦU</p><h2 id="placement-result-title" ref={heading} tabIndex={-1}>Nội dung nên học tiếp</h2><p>Đã trả lời {result.answered} câu · Đúng {result.correct} câu. Đây không phải điểm TOEIC quy đổi.</p><p>{result.note}</p><PlacementReference session={session} busy={busy} onRefresh={onRefresh} /><div className="placement-topics">{result.topics.map(topic => <article key={topic.skillId}><span>Part {topic.part}</span><h3>{topic.skillName}</h3><strong data-status={topic.status}>{statusLabels[topic.status]}</strong><p>{topic.correct}/{topic.attempts} câu đúng · {topic.independentGroups} nhóm tư liệu khác nhau</p></article>)}</div>{!result.topics.length && <p>Chưa đủ bằng chứng để kết luận về từng nhóm kỹ năng.</p>}<nav className="placement-result-links" aria-label="Gợi ý sau đánh giá">{result.recommendations.filter(item => item.href.startsWith('/') && !item.href.startsWith('//')).map(item => <Link key={`${item.href}:${item.label}`} to={item.href}>{item.label} →</Link>)}<Link to="/recommendations">Xem gợi ý học của bạn →</Link></nav>{session.limitations.length > 0 && <details><summary>Giới hạn của đánh giá sơ bộ</summary><ul>{session.limitations.map(note => <li key={note}>{note}</li>)}</ul></details>}</section>;
}

function PlacementReference({ session, busy, onRefresh }: { session: PlacementSession; busy: boolean; onRefresh: () => void }) {
  const reference = session.reference;
  if (!reference) return null;
  const validCount = (total: number | undefined, expected: number | undefined) => typeof total === 'number' && Number.isInteger(total) && total > 0 && typeof expected === 'number' && Number.isFinite(expected) && expected >= 0 && expected <= total;
  const ready = reference.status === 'ready' && validCount(reference.itemCount, reference.expectedCorrect);
  const observedAt = reference.observedAt && Number.isFinite(Date.parse(reference.observedAt)) ? new Date(reference.observedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : null;
  const format = (value: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value);
  return <section className="placement-reference" aria-label="Bộ tham chiếu nội bộ"><h3>Số câu đúng kỳ vọng trên bộ tham chiếu nội bộ</h3><p>{reference.note}</p>{ready && <><strong>{format(reference.expectedCorrect!)} / {reference.itemCount} câu</strong><ul>{reference.byPart?.filter(row => validCount(row.itemCount, row.expectedCorrect)).map(row => <li key={row.part}>Part {row.part}: {format(row.expectedCorrect)} / {row.itemCount} câu</li>)}</ul>{observedAt && <p className="placement-muted">Lịch sử được chốt lúc: {observedAt} (giờ Việt Nam).</p>}{reference.version && <p className="placement-muted">Phiên bản tham chiếu: {reference.version}</p>}<p className="placement-muted">Chỉ so sánh các lần dùng cùng phiên bản và cùng phạm vi câu hỏi. Đây không phải điểm TOEIC, CEFR hoặc phần trăm thành thạo.</p></>}{reference.status === 'pending' && <button className="secondary-button" disabled={busy} onClick={onRefresh}>{busy ? 'Đang tải…' : 'Cập nhật kết quả tham chiếu'}</button>}{reference.status === 'ready' && !ready && <p role="status">Chưa đủ dữ liệu hợp lệ để hiển thị chỉ số tham chiếu.</p>}</section>;
}
