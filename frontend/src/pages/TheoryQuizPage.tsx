import { useTutorContext, useQuestionTutorContext } from '../components/rag/useTutorContext';
import { notifyLearningProgress } from '../lib/learning-progress';
import '../styles/prep-knowledge.css';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { PageHeader } from '../components/ui/PageHeader';
import { ExamStimulus } from '../components/exam/ExamStimulus';
import type { ExamQuestion } from '../types/exam';
import '../styles/exam-room.css';

type Question = ExamQuestion;

interface QuizResult {
    totalQuestions: number;
    correctCount: number;
    scorePercentage: number;
    details: {
        questionId: number;
        selectedAnswer: string;
        correctAnswer: string;
        isCorrect: boolean;
        explanation?: string;
    }[];
}

export const TheoryQuizPage: React.FC = () => {
    const { lessonId } = useParams<{ lessonId: string }>();
    return <TheoryQuiz key={lessonId} lessonId={lessonId} />;
};

const TheoryQuiz: React.FC<{ lessonId?: string }> = ({ lessonId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const origin = location.state as { theoryReturnTo?: string; theorySearch?: string; theoryPage?: number } | null;
    const returnTo = origin?.theoryReturnTo?.startsWith('/theory?') ? origin.theoryReturnTo : `/theory?lesson=${lessonId}`;
    const questionElements = useRef(new Map<number, HTMLFieldSetElement>());
    const resultElement = useRef<HTMLElement>(null);

    const load = useCallback((signal: AbortSignal) =>
        api<Question[]>(`/theory/${lessonId}/quiz`, { signal }), [lessonId]);
    const { data: questions = [], loading, error, reload } = useAsyncResource(load);
    const tutor = useTutorContext();
    const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [result, setResult] = useState<QuizResult | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [answersLocked, setAnswersLocked] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [attemptId] = useState(() => crypto.randomUUID());
    const submittedAnswers = useRef<{ questionId: number; selectedAnswer: string }[] | null>(null);
    const busy = useRef(false);
    const pendingSubmit = useRef<AbortController | null>(null);
    useEffect(() => () => pendingSubmit.current?.abort(), []);

    useEffect(() => { if (result) resultElement.current?.focus(); }, [result]);

    const activeIndex = questions.findIndex(question => question.id === activeQuestionId);
    const activeQuestion = activeIndex >= 0 ? questions[activeIndex] : null;
    useQuestionTutorContext(activeQuestion ? {
        questionId: activeQuestion.id,
        selectedAnswer: answers[activeQuestion.id],
        label: `Câu ${activeIndex + 1} · Ôn kiến thức`,
    } : null);
    const askTutor = (questionId: number, index: number) => {
        setActiveQuestionId(questionId);
        tutor.open({ questionId, selectedAnswer: answers[questionId], label: `Câu ${index + 1} · Ôn kiến thức` });
    };

    const handleSelect = (qId: number, opt: string) => {
        if (result || busy.current || submittedAnswers.current) return;
        setSubmitError('');
        setActiveQuestionId(qId);
        setAnswers((prev) => ({ ...prev, [qId]: opt }));
    };

    const handleSubmit = async () => {
        if (busy.current || result || !questions.length) return;
        const list = Object.entries(answers).map(([qId, selectedAnswer]) => ({
            questionId: Number(qId),
            selectedAnswer,
        }));

        if (list.length < questions.length) {
            setSubmitError('Chọn đáp án cho các câu còn lại rồi nộp bài.');
            const missing = questions.find(question => !answers[question.id]);
            if (missing) questionElements.current.get(missing.id)?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
            return;
        }

        submittedAnswers.current ??= list;
        setAnswersLocked(true);
        busy.current = true;
        const controller = new AbortController();
        pendingSubmit.current = controller;
        setSubmitting(true);
        setSubmitError('');
        try {
            const res = await api<QuizResult>(`/theory/${lessonId}/quiz/submit`, {
                method: 'POST',
                signal: controller.signal,
                data: { answers: submittedAnswers.current, attemptId },
            });
            if (!controller.signal.aborted) { setResult(res); notifyLearningProgress(); }
        } catch (err) {
            if (!controller.signal.aborted) setSubmitError(getErrorMessage(err, 'Chưa nộp được bài. Hãy thử lại.'));
        } finally {
            busy.current = false;
            pendingSubmit.current = null;
            if (!controller.signal.aborted) setSubmitting(false);
        }
    };

    return (
        <div className="page-stack prep-knowledge-page prep-quiz-page mx-auto w-full max-w-3xl">
            {submitError && <p id="theory-submit-error" role="alert" className="status-message text-rose-800">{submitError}</p>}
            {error && <p role="alert" className="status-message">{error} <button className="text-action" onClick={reload}>Thử lại</button></p>}
            <PageHeader variant="compact" title="Quiz củng cố" description={result ? 'Xem lại đáp án và giải thích trước khi học tiếp.' : 'Chọn một đáp án cho mỗi câu rồi nộp bài.'} actions={<button onClick={() => navigate(returnTo, { state: { theorySearch: origin?.theorySearch, theoryPage: origin?.theoryPage } })} className="secondary-button">Đọc lại kiến thức</button>} />
            {result ? <section ref={resultElement} tabIndex={-1} aria-label="Kết quả quiz" role="status" className="prep-quiz-recap flex flex-wrap items-center justify-between gap-4">
                <div><h2 className="section-title">Đúng {result.correctCount} / {result.totalQuestions} câu</h2><p className="mt-1 text-sm text-ink-medium">Kết quả: {result.scorePercentage}% · đáp án đúng được đánh dấu bên dưới.</p></div>
                <button className="primary-button" onClick={() => navigate('/recommendations')}>Chọn bài luyện tiếp</button>
            </section> : !loading && !error && questions.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-kraft pb-4"><h2 className="section-title">Câu hỏi</h2><p role="status" className="text-sm text-ink-medium">Đã trả lời {Object.keys(answers).length} / {questions.length} câu</p></div>}

            {loading ? (
                <div role="status" className="learning-surface text-sm text-ink-medium">Đang tải câu hỏi…</div>
            ) : error ? null : questions.length === 0 ? (
                <div className="bg-white p-8 text-center text-slate-500 font-body">Chưa có câu hỏi cho bài này.</div>
            ) : (
                <div className="prep-quiz-sheet space-y-6 rounded-xl bg-paper-white p-5 sm:p-8">
                    {questions.map((q, idx) => {
                        const detail = result?.details.find((d) => d.questionId === q.id);
                        return (
                            <div key={q.id}><fieldset ref={element => { if (element) questionElements.current.set(q.id, element); else questionElements.current.delete(q.id); }} aria-describedby={submitError ? "theory-submit-error" : undefined} disabled={answersLocked || !!result} className="min-w-0 border-0 border-b border-paper-kraft/60 pb-6 space-y-4">
                                <legend className="font-body font-semibold text-ink-dark text-base leading-relaxed pr-2">
                                    <span className="text-blue-700 mr-2">Câu {idx + 1}:</span>
                                    {q.content}
                                </legend>

                                {Boolean(q.audioUrl || q.imageUrl || q.passage || q.stimulus?.documents?.length) && <div className="space-y-4 rounded-lg border border-paper-kraft bg-paper-cream p-4">
                                    {q.audioUrl && <audio controls preload="none" src={q.audioUrl} className="w-full" aria-label={`Audio câu ${idx + 1}`} />}
                                    {Boolean(q.imageUrl || q.passage || q.stimulus?.documents?.length) && <ExamStimulus question={q} blankNumbers={{}} />}
                                </div>}

                                <div className="grid grid-cols-1 gap-2">
                                    {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                                        if (q.part === 2 && opt === 'D') return null;
                                        const optText = q[`option${opt}` as keyof Question];
                                        if (!(q.part <= 2) && (typeof optText !== 'string' || !optText.trim())) return null;
                                        const isSelected = answers[q.id] === opt;

                                        let btnClass = 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50';
                                        if (isSelected) btnClass = 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600 font-semibold';

                                        if (detail) {
                                            if (detail.correctAnswer === opt) {
                                                btnClass = 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600 font-bold';
                                            } else if (isSelected && !detail.isCorrect) {
                                                btnClass = 'border-rose-500 bg-rose-50 text-rose-900 ring-1 ring-rose-500';
                                            }
                                        }

                                        return (
                                            <label key={opt} className={`min-h-12 p-3 text-left font-body text-sm border rounded-lg transition-colors flex items-start gap-3 cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-slate-900 has-[:focus-visible]:ring-offset-2 ${btnClass}`}>
                                                <input type="radio" name={`question-${q.id}`} value={opt} checked={isSelected} onChange={() => handleSelect(q.id, opt)} className="mt-0.5 shrink-0 accent-slate-900" />
                                                <span className="min-w-0 break-words"><strong>{opt}.</strong> {!(q.part <= 2) && typeof optText === 'string' ? optText : ''}{detail?.correctAnswer === opt && <span className="block mt-1 text-xs font-semibold">Đáp án đúng</span>}{detail && isSelected && !detail.isCorrect && <span className="block mt-1 text-xs font-semibold">Bạn đã chọn</span>}</span>
                                            </label>
                                        );
                                    })}
                                </div>

                                {detail && detail.explanation && (
                                    <div className="border-l-2 border-accent-sage pl-4 text-sm leading-6 text-ink-medium">
                                        <span className="font-bold text-blue-700">Giải thích: </span>
                                        {detail.explanation}
                                    </div>
                                )}
                            </fieldset>
                            <button type="button" className="secondary-button mt-3" disabled={submitting} onClick={() => askTutor(q.id, idx)}>Hỏi AI về câu này</button>
                            </div>
                        );
                    })}

                    {answersLocked && !submitting && !result && <p className="text-sm text-ink-medium">Đáp án đã được giữ nguyên. Gửi lại để nhận kết quả.</p>}
                    {!result && (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="primary-button w-full sm:w-auto"
                        >
                            {submitting ? 'Đang nộp bài…' : answersLocked ? 'Gửi lại bài đã chọn' : 'Nộp bài quiz'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
