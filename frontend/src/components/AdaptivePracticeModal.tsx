import { notifyLearningProgress } from '../lib/learning-progress';
import '../styles/exam-room.css';
import { ExamStimulus } from './exam/ExamStimulus';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useDialogFocus } from '../hooks/useDialogFocus';
import { api, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { RagExplanationModal } from './rag/RagExplanationModal';
import { PracticeSupport } from './PracticeSupport';
import type {
  SkillMasteryItem,
  AdaptiveQuestion,
  AdaptiveQuestionResponse,
  AnswerAdaptiveResponse,
} from '../types/mastery';

interface Props {
  skill: SkillMasteryItem;
  onClose: () => void;
  onAnswerRecorded: () => void;
  onNextQuestion?: () => void;
  contextLabel?: string;
}

export const AdaptivePracticeModal: React.FC<Props> = ({ skill, onClose, onAnswerRecorded, onNextQuestion, contextLabel }) => {
  const load = useCallback((signal: AbortSignal) =>
    api<AdaptiveQuestionResponse>(`/das3h/adaptive-question?skillId=${skill.skillId}`, { signal }), [skill.skillId]);
  const { data: adaptiveData, loading: loadingAdaptive, error, reload } = useAsyncResource(load);
  const [practiceAttemptId, setPracticeAttemptId] = useState(() => crypto.randomUUID());
  const answerPayload = useRef<string | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerAdaptiveResponse | null>(null);
  const [showRagModal, setShowRagModal] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const pendingAnswer = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useDialogFocus(dialog, true, onClose);

  useEffect(() => () => pendingAnswer.current?.abort(), []);

  const loadQuestion = () => {
    if (pendingAnswer.current) return;
    dialog.current?.focus();
    setSelectedOpt(null);
    setPracticeAttemptId(crypto.randomUUID());
    answerPayload.current = null;
    setAnswerLocked(false);
    setAnswerResult(null);
    setShowRagModal(false);
    setSubmitError('');
    reload();
  };

  const submitAdaptiveAnswer = async () => {
    if (!adaptiveData || loadingAdaptive || !selectedOpt || pendingAnswer.current || answerResult) return;

    const controller = new AbortController();
    pendingAnswer.current = controller;
    answerPayload.current ??= selectedOpt;
    setAnswerLocked(true);
    setSubmittingAnswer(true);
    setSubmitError('');
    try {
      const res = await api<AnswerAdaptiveResponse>('/das3h/answer-adaptive', {
        method: 'POST',
        signal: controller.signal,
        data: {
          questionId: adaptiveData.selectedQuestion.id,
          selectedAnswer: answerPayload.current,
          attemptId: practiceAttemptId,
          skillId: skill.skillId,
        },
      });

      if (!controller.signal.aborted) {
        notifyLearningProgress();
        setAnswerResult(res);
        onAnswerRecorded();
      }
    } catch (err) {
      if (!controller.signal.aborted) setSubmitError(getErrorMessage(err, 'Chưa gửi được câu trả lời. Hãy thử lại.'));
    } finally {
      pendingAnswer.current = null;
      if (!controller.signal.aborted) setSubmittingAnswer(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Luyện kỹ năng" tabIndex={-1} className="bg-paper-white max-w-2xl w-full border border-paper-kraft rounded-lg shadow-paper-heavy p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">

        <div className="flex justify-between items-start gap-4 border-b border-paper-kraft pb-3">
          <div className="min-w-0">
            <span className="text-xs font-semibold text-ink-medium">
              {contextLabel || 'Luyện kỹ năng'}
            </span>
            <h3 className="text-xl font-semibold leading-snug break-words text-ink-dark mt-1">
              {skill.skillName} (Part {skill.part})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 min-h-11 px-2 text-sm text-ink-medium hover:text-ink-dark"
          >
            Đóng
          </button>
        </div>

        {submitError && <p role="alert" className="status-message text-rose-800">{submitError}</p>}
        {loadingAdaptive ? (
          <div role="status" className="py-10 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-paper-kraft border-t-accent-navy rounded-full animate-spin mx-auto" />
            <p className="text-sm text-ink-medium">
              Đang chuẩn bị câu hỏi…
            </p>
          </div>
        ) : !adaptiveData ? (
          <div role="alert" className="py-8 text-center text-ink-medium">
            {error || 'Không tìm thấy câu hỏi thích ứng cho kỹ năng này.'}
            <button onClick={loadQuestion} className="block mx-auto mt-3 underline">Thử lại</button>
          </div>
        ) : (
          <div className="space-y-6">
            {adaptiveData.selectedQuestion.part >= 3 ? <ExamStimulus question={adaptiveData.selectedQuestion} blankNumbers={{}} /> : adaptiveData.selectedQuestion.imageUrl && <img src={adaptiveData.selectedQuestion.imageUrl} alt="Hình ảnh câu hỏi" className="max-h-60 max-w-full mx-auto object-contain" />}
            {adaptiveData.selectedQuestion.part <= 2 && <p className="text-sm text-ink-medium">Luyện nghe: nghe và chọn {adaptiveData.selectedQuestion.part === 2 ? 'một trong ba' : 'một trong bốn'} đáp án. Nội dung lời thoại được ẩn khi trả lời.</p>}

            {adaptiveData.selectedQuestion.audioUrl && (
              <div className="bg-paper-cream p-3 rounded border border-paper-kraft">
                <p className="font-body text-xs text-ink-medium mb-1">File âm thanh câu hỏi:</p>
                <audio controls className="w-full">
                  <source src={adaptiveData.selectedQuestion.audioUrl} type="audio/mpeg" />
                  Trình duyệt không hỗ trợ phát âm thanh.
                </audio>
              </div>
            )}

            {adaptiveData.selectedQuestion.part > 2 && <div className="font-exam font-bold text-ink-dark text-base">
              {adaptiveData.selectedQuestion.content}
            </div>}

            <div className="space-y-2 font-exam text-sm">
              {(adaptiveData.selectedQuestion.part === 2 ? ['A', 'B', 'C'] as const : ['A', 'B', 'C', 'D'] as const).map((opt) => {
                const optKey = `option${opt}` as keyof AdaptiveQuestion;
                const optText = adaptiveData.selectedQuestion[optKey] as string;
                if (adaptiveData.selectedQuestion.part > 2 && !optText?.trim()) return null;

                const isSelected = selectedOpt === opt;
                const isAnswered = !!answerResult;
                const isCorrect = answerResult?.correctAnswer === opt;
                const isWrongChoice = isAnswered && isSelected && !answerResult.isCorrect;

                let btnClass = 'border-paper-kraft bg-paper-cream hover:bg-paper-kraft-light/40 text-ink-dark';

                if (isSelected && !isAnswered) {
                  btnClass = 'border-accent-navy bg-paper-cream text-ink-dark font-semibold ring-1 ring-accent-navy';
                }

                if (isAnswered) {
                  if (isCorrect) {
                    btnClass = 'border-emerald-500 bg-emerald-100 text-emerald-950 font-bold ring-2 ring-emerald-500';
                  } else if (isWrongChoice) {
                    btnClass = 'border-rose-500 bg-rose-100 text-rose-950 font-bold ring-2 ring-rose-500';
                  } else {
                    btnClass = 'border-slate-200 bg-slate-50 text-slate-400 opacity-60';
                  }
                }

                return (
                  <button
                    key={opt}
                    disabled={isAnswered || submittingAnswer || answerLocked}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedOpt(opt)}
                    className={`w-full p-3 text-left border rounded transition flex items-start gap-3 ${btnClass}`}
                  >
                    <span className="font-bold shrink-0">{opt}.</span>
                    {adaptiveData.selectedQuestion.part > 2 && <span className="flex-1">{optText}</span>}
                  </button>
                );
              })}
            </div>

            {answerResult && (
              <div className={`p-4 rounded border ${answerResult.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'} space-y-2`}>
                <div role="status" className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-semibold">
                    {answerResult.isCorrect ? 'Chính xác' : 'Chưa chính xác'}
                  </span>
                  <span className="font-body text-xs font-bold text-ink-medium">
                    (Đáp án chuẩn là <strong className="text-ink-dark">{answerResult.correctAnswer}</strong>)
                  </span>
                </div>

                {answerResult.explanation && (
                  <div className="font-body text-xs text-ink-medium bg-white/70 p-3 rounded border border-dashed border-slate-300">
                    <strong className="text-ink-dark block mb-1">Giải thích chi tiết:</strong>
                    {answerResult.explanation}
                  </div>
                )}

                <p className="font-mono text-xs text-ink-medium">
                  Đã lưu kết quả luyện tập.
                </p>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <button
                    onClick={() => setShowRagModal(true)}
                    className="px-3 py-1.5 bg-paper-cream hover:bg-paper-kraft-light/50 border border-paper-kraft text-ink-dark rounded text-xs font-bold shadow-sm transition"
                  >
                    Phân tích chi tiết AI (RAG)
                  </button>
                </div>
              </div>
            )}

            {answerResult && !answerResult.isCorrect && <PracticeSupport
              key={practiceAttemptId}
              questionId={adaptiveData.selectedQuestion.id}
              skillId={skill.skillId}
              attemptId={practiceAttemptId}
              onPracticeAgain={loadQuestion}
            />}

            <div className="flex flex-col items-stretch gap-3 pt-4 border-t border-paper-kraft sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {!answerResult ? (
                <button
                  disabled={!selectedOpt || submittingAnswer}
                  onClick={submitAdaptiveAnswer}
                  className="primary-button"
                >
                  {submittingAnswer ? 'Đang chấm bài…' : 'Kiểm tra đáp án'}
                </button>
              ) : (
                <>
                  <button
                    onClick={onNextQuestion || loadQuestion}
                    className="primary-button"
                  >
                    Câu tiếp theo
                  </button>
                  <button
                    onClick={onClose}
                    className="secondary-button"
                  >
                    Hoàn tất
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {showRagModal && adaptiveData && selectedOpt && (
          <RagExplanationModal
            isOpen={showRagModal}
            onClose={() => setShowRagModal(false)}
            questionId={adaptiveData.selectedQuestion.id}
            selectedAnswer={selectedOpt}
          />
        )}
      </div>
    </div>
  );
};
