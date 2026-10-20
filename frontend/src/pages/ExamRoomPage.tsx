import '../styles/exam-room.css';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Navigate, useParams, useNavigate } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { clearExamStorage, readAnswers, remainingSeconds, saveAnswers, readDraftRevision } from '../lib/exam-session';
import { buildExamGroups, displayExamNumber, readingNeighbor } from '../lib/exam-navigation';
import { readListeningCursor, saveListeningCursor } from '../lib/exam-listening';
import { listeningRestSeconds } from '../lib/exam-pacing';
import { ExamListeningAudio } from '../components/exam/ExamListeningAudio';
import { ExamStimulus } from '../components/exam/ExamStimulus';
import type { ExamQuestion, ExamRenderNode, ExamSession } from '../types/exam';

function hasGraphicalStimulus(question: ExamQuestion): boolean {
  const graphical = (node: ExamRenderNode): boolean => node.type === 'table' || node.type === 'image' || ('children' in node && node.children.some(graphical));
  return question.stimulus?.documents.some(document => document.blocks.some(graphical)) ?? false;
}

export const ExamRoomPage = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const load = useCallback((signal: AbortSignal) => api<ExamSession>(`/exam/${attemptId}`, { signal }), [attemptId]);
  const { data, loading, error, reload } = useAsyncResource(load);
  if (loading) return <p role="status" className="exam-load-state">Đang chuẩn bị đề thi…</p>;
  if (!data) return <div role="alert" className="exam-load-state"><p>{error || 'Chưa tải được đề thi.'}</p><button className="secondary-button" onClick={reload}>Thử lại</button></div>;
  if (data.submittedAt) return <Navigate replace to={`/exam/${data.attemptId}/review`} />;
  return <ExamRoom key={data.attemptId} exam={data} />;
};

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  return `${hours ? `${String(hours).padStart(2, '0')}:` : ''}${String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ExamRoom({ exam }: { exam: ExamSession }) {
  const { attemptId, questions } = exam;
  const navigate = useNavigate();
  const groups = useMemo(() => buildExamGroups(questions), [questions]);
  const listeningGroups = useMemo(() => groups.filter(group => group.part <= 4), [groups]);
  const [cursor] = useState(() => readListeningCursor(attemptId));
  const [listeningFinished, setListeningFinished] = useState(() => !!cursor.readingUnlocked && !questions.some(question => question.part >= 5));
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (!listeningGroups.length || cursor.readingUnlocked) {
      const firstReading = questions.findIndex(question => question.part >= 5);
      return firstReading >= 0 ? firstReading : Math.max(0, questions.length - 1);
    }
    return listeningGroups[Math.min(cursor.maxGroupIndex, listeningGroups.length - 1)].indices[0];
  });
  const [answers, setAnswers] = useState<Record<number, string>>(() => ({
    ...Object.fromEntries((exam.draftAnswers ?? []).map(answer => [answer.questionId, answer.selectedAnswer])),
    ...readAnswers(attemptId, questions.map(question => question.id)),
  }));
  const latestAnswers = useRef(answers);
  const revision = useRef(exam.draftRevision ?? 0);
  const savedAnswers = useRef(JSON.stringify(Object.fromEntries((exam.draftAnswers ?? []).map(answer => [answer.questionId, answer.selectedAnswer]))));
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error' | 'conflict'>(() => {
    const same = JSON.stringify(answers) === JSON.stringify(Object.fromEntries((exam.draftAnswers ?? []).map(answer => [answer.questionId, answer.selectedAnswer])));
    if (same) return 'saved';
    const localRevision = readDraftRevision(attemptId);
    return (exam.draftRevision ?? 0) > (localRevision ?? 0) ? 'conflict' : 'saving';
  });
  const [saveRetry, setSaveRetry] = useState(0);
  const saveInFlight = useRef(false);
  const [saveComplete, setSaveComplete] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => remainingSeconds(exam));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const submittingRef = useRef(false);
  const autoSubmitted = useRef(false);
  const pendingSubmit = useRef<AbortController | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const paletteTrigger = useRef<HTMLButtonElement>(null);
  const questionsRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<HTMLElement>(null);
  const focusQuestion = useRef(true);
  const activeGroup = groups.find(group => group.indices.includes(currentIndex));
  const activeGroupKey = activeGroup?.key;
  const activePart = activeGroup?.part;
  const currentQ = questions[currentIndex];
  const listening = !!currentQ && currentQ.part <= 4;
  const answeredCount = Object.keys(answers).length;
  const loadServerDraft = () => {
    if (window.confirm('Tải bản lưu máy chủ sẽ thay thế các đáp án chưa đồng bộ trong tab này. Tiếp tục?')) { clearExamStorage(attemptId); window.location.reload(); }
  };
  const closePalette = () => { setPaletteOpen(false); paletteTrigger.current?.focus(); };

  useEffect(() => () => pendingSubmit.current?.abort(), []);
  useEffect(() => {
    const dismiss = (event: MouseEvent) => { if (!paletteRef.current?.contains(event.target as Node)) setPaletteOpen(false); };
    document.addEventListener('mousedown', dismiss);
    return () => document.removeEventListener('mousedown', dismiss);
  }, []);
  useEffect(() => {
    if (focusQuestion.current) {
      questionsRef.current?.querySelector<HTMLElement>(`#exam-question-${currentIndex}`)?.focus();
      focusQuestion.current = false;
    }
  }, [currentIndex]);
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.scrollTop = 0;
      if (window.matchMedia('(max-width: 767px)').matches) materialRef.current.scrollIntoView?.({ block: 'start' });
    }
  }, [activeGroupKey]);

  const expired = timeLeft <= 0;
  const conflicted = saveState === 'conflict';
  useEffect(() => {
    const serialized = JSON.stringify(answers);
    if (serialized === savedAnswers.current || submitting || expired || conflicted) return;
    const timer = window.setTimeout(async () => {
      if (saveInFlight.current) return;
      saveInFlight.current = true;
      setSaveState('saving');
      try {
        const saved = await api<{ draftRevision: number }>(`/exam/${attemptId}/draft`, {
          method: 'PATCH',
          data: { revision: revision.current + 1, answers: Object.entries(answers).map(([questionId, selectedAnswer]) => ({ questionId: Number(questionId), selectedAnswer })) },
        });
        revision.current = saved.draftRevision;
        savedAnswers.current = serialized;
        saveAnswers(attemptId, latestAnswers.current, saved.draftRevision);
        setSaveState(JSON.stringify(latestAnswers.current) === serialized ? 'saved' : 'saving');
        setSaveComplete(value => value + 1);
      } catch (cause) {
        // A PATCH may have committed even when its response was lost. Reconcile
        // before retrying the same revision, which would otherwise conflict.
        let reconciled = false;
        let conflict = cause instanceof Error && 'status' in cause && cause.status === 409;
        try {
          const status = await api<ExamSession>(`/exam/${attemptId}`);
          if (status.submittedAt) { clearExamStorage(attemptId); navigate(`/exam/${attemptId}/review`); return; }
          const remote = JSON.stringify(Object.fromEntries((status.draftAnswers ?? []).map(answer => [answer.questionId, answer.selectedAnswer])));
          if (remote === serialized) {
            revision.current = status.draftRevision ?? revision.current;
            savedAnswers.current = serialized;
            saveAnswers(attemptId, latestAnswers.current, revision.current);
            reconciled = true;
            setSaveComplete(value => value + 1);
          } else if ((status.draftRevision ?? 0) > revision.current) conflict = true;
        } catch { /* Preserve the local draft while offline or reauthenticating. */ }
        setSaveState(reconciled ? JSON.stringify(latestAnswers.current) === serialized ? 'saved' : 'saving' : conflict ? 'conflict' : 'error');
      } finally {
        saveInFlight.current = false;
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [answers, attemptId, submitting, expired, saveRetry, saveComplete, conflicted, navigate]);

  const handleSelect = (index: number, option: string) => {
    if (timeLeft <= 0 || submittingRef.current || conflicted || !activeGroup || !activeGroup.indices.includes(index)) return;
    const next = { ...answers, [questions[index].id]: option };
    latestAnswers.current = next;
    setAnswers(next);
    setSaveState('saving');
    if (!listening) setCurrentIndex(index);
    setStorageUnavailable(!saveAnswers(attemptId, next, revision.current));
  };
  const completeListening = () => {
    if (!activeGroupKey || !activePart || activePart >= 5 || submittingRef.current || timeLeft <= 0) return;
    const position = listeningGroups.findIndex(group => group.key === activeGroupKey);
    const nextGroup = listeningGroups[position + 1];
    const firstReading = questions.findIndex(question => question.part >= 5);
    saveListeningCursor(attemptId, { maxGroupIndex: position + 1, readingUnlocked: !nextGroup });
    focusQuestion.current = true;
    if (nextGroup) setCurrentIndex(nextGroup.indices[0]);
    else if (firstReading >= 0) setCurrentIndex(firstReading);
    else setListeningFinished(true);
  };
  const navigateReading = (index: number) => {
    focusQuestion.current = true;
    setCurrentIndex(index);
  };
  const handleSubmit = useCallback(async (automatic = false) => {
    if (submittingRef.current || (conflicted && !automatic && timeLeft > 0)) return;

    const answeredCount = Object.keys(answers).length;
    if (!automatic && timeLeft > 0 && answeredCount < questions.length) {
      const confirmSubmit = window.confirm(
        `Bạn mới hoàn thành ${answeredCount}/${questions.length} câu. Bạn có chắc chắn muốn nộp bài?`,
      );
      if (!confirmSubmit) return;
    }

    submittingRef.current = true;
    const controller = new AbortController();
    pendingSubmit.current = controller;
    setSubmitting(true);
    setSubmitError('');
    try {
      const answerList = Object.entries(answers).map(([qId, selectedAnswer]) => ({
        questionId: Number(qId),
        selectedAnswer,
      }));

      await api('/exam/submit', {
        method: 'POST',
        signal: controller.signal,
        data: {
          attemptId: Number(attemptId),
          answers: answerList,
        },
      });

      if (controller.signal.aborted) return;
      clearExamStorage(attemptId);
      navigate(`/exam/${attemptId}/review`);
    } catch (err) {
      if (controller.signal.aborted) return;
      try {
        const status = await api<ExamSession>(`/exam/${attemptId}`, { signal: controller.signal });
        if (status.submittedAt) {
          clearExamStorage(attemptId);
          navigate(`/exam/${attemptId}/review`);
          return;
        }
      } catch { /* Keep the local draft available for a deliberate retry. */ }
      setSubmitError(getErrorMessage(err, 'Chưa nộp được bài. Bấm Nộp bài để thử lại.'));
      submittingRef.current = false;
      setSubmitting(false);
    } finally {
      if (pendingSubmit.current === controller) pendingSubmit.current = null;
    }
  }, [answers, attemptId, navigate, questions.length, timeLeft, conflicted]);

  useEffect(() => {
    const tick = () => {
      const remaining = remainingSeconds(exam);
      setTimeLeft(remaining);
      if (remaining === 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        void handleSubmit(true);
      }
    };
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [exam, handleSubmit]);

  if (!currentQ || !activeGroup) return <div className="exam-load-state"><p>Đề thi này chưa có câu hỏi.</p><button className="secondary-button" onClick={() => navigate('/exam')}>Chọn đề khác</button></div>;
  if (listeningFinished) return <div className="exam-load-state"><h1 className="text-xl font-semibold">Đã hoàn thành phần nghe</h1><p className="mt-3">Bạn đã chọn {answeredCount}/{questions.length} câu. Nộp bài để xem kết quả và lời giải.</p>{conflicted && <p role="alert">Có bản lưu mới ở phiên khác. <button className="text-action" onClick={loadServerDraft}>Tải bản lưu máy chủ</button></p>}{expired && <p>Đã hết giờ. Bài được chấm theo đáp án máy chủ đã nhận trước hạn.</p>}{submitError && <p role="alert">{submitError}</p>}<button className="primary-button mt-5" disabled={submitting || (conflicted && !expired)} onClick={() => void handleSubmit()}>{submitting ? 'Đang nộp…' : 'Nộp bài và xem kết quả'}</button></div>;
  const number = (index: number) => displayExamNumber(exam.examType, index, questions);
  const groupLabel = activeGroup.indices.length > 1 ? `${number(activeGroup.indices[0])}–${number(activeGroup.indices.at(-1)!)}` : String(number(currentIndex));
  const previous = readingNeighbor(questions, currentIndex, -1);
  const next = readingNeighbor(questions, currentIndex, 1);
  const hiddenListeningText = currentQ.part <= 2;
  const blankNumbers = currentQ.part === 6 ? Object.fromEntries(activeGroup.indices.map(index => [questions[index].stimulus?.questionPosition ?? -1, number(index)])) : {};
  const listeningGraphic = currentQ.part >= 3 && currentQ.part <= 4 && hasGraphicalStimulus(currentQ);

  return <div className="exam-workbench">
    <header className="exam-toolbar">
      <div className="exam-toolbar-title"><span className="exam-part-badge">PART {currentQ.part}</span><span className="exam-progress"><strong>{answeredCount}</strong> / {questions.length}<span className="exam-progress-label"> câu đã chọn</span></span></div>
      <div className="exam-timer" aria-label={`Thời gian còn lại ${formatTime(timeLeft)}`}><span>Thời gian còn lại</span><strong>{formatTime(timeLeft)}</strong></div>
      <button className="exam-submit" disabled={submitting || (conflicted && !expired)} onClick={() => void handleSubmit()}>{submitting ? 'Đang nộp…' : 'Nộp bài'}</button>
    </header>
    {(submitError || storageUnavailable) && <div className="exam-notices">{submitError && <p role="alert">{submitError} Đáp án vẫn được giữ; bấm Nộp bài để thử lại.</p>}{storageUnavailable && <p role="alert">Không thể lưu đáp án trên trình duyệt. Hãy giữ trang này mở đến khi nộp bài.</p>}</div>}
    {(saveState === 'error' || saveState === 'conflict') && <div className="exam-notices" role="alert">{saveState === 'conflict' ? <>Bài thi đã được lưu ở phiên khác. <button className="text-action" onClick={loadServerDraft}>Tải bản lưu máy chủ</button></> : <>Chưa lưu được lên máy chủ. Bản nháp vẫn được giữ trong tab này. <button className="text-action" onClick={() => setSaveRetry(value => value + 1)}>Thử lưu lại</button></>}</div>}
    {expired && <div className="exam-notices" role="status">Đã hết giờ. Máy chủ chấm các đáp án nhận được trước hạn; các thay đổi chưa đồng bộ sau hạn không được tính.</div>}
    <div className="exam-split">
      <section className="exam-column exam-material-column" aria-label="Tư liệu bài thi" ref={materialRef} tabIndex={0}>
        <div className="exam-column-heading"><h2>{listening ? 'Listening' : 'Reading'}</h2><span>Câu {groupLabel}</span></div>
        <div className="exam-material-body">
          {listening ? <><div className="exam-audio-panel"><span className="exam-section-kicker">Bài nghe · Part {currentQ.part}</span>{currentQ.audioUrl ? <ExamListeningAudio key={`${attemptId}:${activeGroup.key}`} attemptId={attemptId} groupKey={activeGroup.key} src={currentQ.audioUrl} restSeconds={listeningRestSeconds(exam.listeningPlan?.groups.find(group => group.firstQuestionId === currentQ.id)?.restSeconds, activeGroup.indices.length)} onComplete={completeListening} disabled={timeLeft <= 0 || submitting} /> : <p role="alert">Bài nghe chưa có audio. Vui lòng báo lỗi nguồn đề thi.</p>}</div>{listeningGraphic ? <ExamStimulus question={currentQ} blankNumbers={{}} /> : currentQ.imageUrl && <img className="exam-source-image" src={currentQ.imageUrl} alt={`Hình ảnh câu ${groupLabel}`} />}{currentQ.part === 2 && <div className="exam-material-note"><span>QUESTION–RESPONSE</span><h3>Nghe và chọn đáp án.</h3><p>Câu hỏi và ba phương án được đọc trong bài nghe.</p></div>}</> : <ExamStimulus question={currentQ} blankNumbers={blankNumbers} />}
        </div>
      </section>
      <section className="exam-column exam-questions-column" aria-label="Câu hỏi và đáp án" ref={questionsRef} tabIndex={0}>
        <div className="exam-column-heading"><h2>{activeGroup.indices.length > 1 ? 'Nhóm câu hỏi' : 'Câu hỏi'}</h2><span>Chọn một đáp án</span></div>
        <div className="exam-question-list">{activeGroup.indices.map(index => {
          const question = questions[index];
          const selected = answers[question.id];
          const options = question.part === 2 ? ['A', 'B', 'C'] as const : ['A', 'B', 'C', 'D'] as const;
          return <fieldset id={`exam-question-${index}`} tabIndex={-1} key={question.id} className="exam-question-block" data-active={index === currentIndex || undefined}>
            <legend><span className="exam-question-number">{number(index)}</span><span>Câu {number(index)}</span>{selected && <span className="exam-answer-state">Đã chọn {selected}</span>}</legend>
            {!hiddenListeningText && <p className="exam-question-content">{question.part === 6 ? `Chọn đáp án cho chỗ trống (${number(index)}).` : question.content}</p>}
            <div className={`exam-options ${hiddenListeningText ? 'exam-options-letters' : ''}`}>{options.map(option => {
              const text = question[`option${option}`];
              if (!hiddenListeningText && !text?.trim()) return null;
              return <label key={option} className="exam-option" data-selected={selected === option || undefined}><input type="radio" name={`answer-${question.id}`} value={option} checked={selected === option} disabled={timeLeft <= 0 || submitting || conflicted} onChange={() => handleSelect(index, option)} aria-label={hiddenListeningText ? `Câu ${number(index)}, đáp án ${option}` : undefined} /><span className="exam-option-letter">{option}</span>{!hiddenListeningText && <span className="exam-option-text">{text}</span>}</label>;
            })}</div>
          </fieldset>;
        })}</div>
      </section>
    </div>
    <footer className="exam-footer">
      {listening ? <p className="exam-listening-status" role="status">Listening{exam.listeningPlan ? ` · ${formatTime(exam.listeningPlan.targetSeconds)}` : ""} · Câu {groupLabel}<span>Hết audio có thời gian chọn đáp án, sau đó tự chuyển câu.</span></p> : <><button className="exam-nav-button" disabled={previous === currentIndex || submitting} onClick={() => navigateReading(previous)}>Câu trước</button><div className="exam-palette-anchor" ref={paletteRef} onKeyDown={event => { if (event.key === 'Escape' && paletteOpen) { event.preventDefault(); closePalette(); } }}><button className="exam-palette-trigger" ref={paletteTrigger} aria-expanded={paletteOpen} aria-controls="exam-palette" onClick={() => setPaletteOpen(value => !value)}>Câu {number(currentIndex)} <span aria-hidden="true">{paletteOpen ? '▾' : '▴'}</span></button>{paletteOpen && <div id="exam-palette" className="exam-palette"><div className="exam-palette-heading"><strong>Reading</strong><span><i className="exam-green-dot" /> Đã chọn · Xám: chưa làm</span></div><div className="exam-palette-grid">{questions.map((question, index) => question.part >= 5 && <button key={question.id} disabled={submitting} data-answered={!!answers[question.id] || undefined} aria-current={index === currentIndex ? 'step' : undefined} aria-label={`Câu ${number(index)}, ${answers[question.id] ? 'đã chọn' : 'chưa làm'}`} onClick={() => { if (index === currentIndex) closePalette(); else { navigateReading(index); setPaletteOpen(false); } }}>{number(index)}</button>)}</div></div>}</div><button className="exam-nav-button" disabled={next === currentIndex || submitting} onClick={() => navigateReading(next)}>Câu tiếp</button></>}
      <span className="exam-saving-label" role="status">{saveState === 'saving' ? 'Đang lưu máy chủ…' : saveState === 'error' || saveState === 'conflict' ? 'Chưa đồng bộ máy chủ' : 'Đã lưu máy chủ'}</span>
    </footer>
  </div>;
}
