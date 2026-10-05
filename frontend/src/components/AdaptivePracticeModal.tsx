import React, { useState, useCallback, useEffect, useRef } from 'react';
import { api, getErrorMessage } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { RagExplanationModal } from './rag/RagExplanationModal';
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
}

export const AdaptivePracticeModal: React.FC<Props> = ({ skill, onClose, onAnswerRecorded }) => {
  const load = useCallback((signal: AbortSignal) =>
    api<AdaptiveQuestionResponse>(`/das3h/adaptive-question?skillId=${skill.skillId}`, { signal }), [skill.skillId]);
  const { data: adaptiveData, loading: loadingAdaptive, error, reload } = useAsyncResource(load);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerAdaptiveResponse | null>(null);
  const [showRagModal, setShowRagModal] = useState(false);
  const pendingAnswer = useRef<AbortController | null>(null);

  useEffect(() => () => pendingAnswer.current?.abort(), []);

  const loadQuestion = () => {
    if (pendingAnswer.current) return;
    setSelectedOpt(null);
    setAnswerResult(null);
    setShowRagModal(false);
    reload();
  };

  const submitAdaptiveAnswer = async () => {
    if (!adaptiveData || loadingAdaptive || !selectedOpt || pendingAnswer.current || answerResult) return;

    const controller = new AbortController();
    pendingAnswer.current = controller;
    setSubmittingAnswer(true);
    try {
      const res = await api<AnswerAdaptiveResponse>('/das3h/answer-adaptive', {
        method: 'POST',
        signal: controller.signal,
        data: {
          questionId: adaptiveData.selectedQuestion.id,
          selectedAnswer: selectedOpt,
          skillId: skill.skillId,
        },
      });

      if (!controller.signal.aborted) {
        setAnswerResult(res);
        onAnswerRecorded();
      }
    } catch (err) {
      if (!controller.signal.aborted) alert(getErrorMessage(err, 'Lỗi gửi câu trả lời'));
    } finally {
      pendingAnswer.current = null;
      if (!controller.signal.aborted) setSubmittingAnswer(false);
    }
  };

  return (
    <div className="modal-backdrop fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper-white max-w-2xl w-full border border-paper-kraft rounded-lg shadow-paper-heavy p-6 md:p-8 space-y-6 relative max-h-[90vh] overflow-y-auto">
        <div className="staple top-3 left-6" />
        <div className="staple top-3 right-6" />

        <div className="flex justify-between items-start border-b border-paper-kraft pb-3">
          <div>
            <span className="font-mono text-xs font-bold text-accent-coral uppercase">
              LUYỆN TẬP THÍCH ỨNG VÙNG ZPD
            </span>
            <h3 className="font-display text-2xl font-bold text-ink-dark mt-0.5">
              {skill.skillName} (Part {skill.part})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-ink-light hover:text-ink-dark font-mono text-2xl font-bold"
          >
            Đóng
          </button>
        </div>

        {loadingAdaptive ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-10 h-10 border-4 border-paper-kraft border-t-accent-coral rounded-full animate-spin mx-auto" />
            <p className="font-hand text-lg text-ink-medium">
              DAS3H đang chọn lọc câu hỏi thích ứng tối ưu...
            </p>
          </div>
        ) : !adaptiveData ? (
          <div className="py-8 text-center text-ink-medium font-body">
            {error || 'Không tìm thấy câu hỏi thích ứng cho kỹ năng này.'}
            <button onClick={loadQuestion} className="block mx-auto mt-3 underline">Thử lại</button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-paper-cream p-3 border border-paper-kraft rounded flex flex-wrap items-center justify-between text-xs font-mono gap-2">
              <span>
                Xác suất dự kiến: <strong className="text-accent-coral font-bold">{(adaptiveData.predictedProb * 100).toFixed(1)}%</strong>
              </span>
              <span>Mục tiêu ZPD: <strong>{(adaptiveData.targetProb * 100).toFixed(0)}%</strong></span>
              <span>Chế độ: <strong>{adaptiveData.isExploration ? 'Khám phá' : 'Tối ưu'}</strong></span>
            </div>

            {adaptiveData.selectedQuestion.passage && (
              <div className="bg-paper-cream p-4 border border-paper-kraft rounded font-exam text-sm leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">
                {adaptiveData.selectedQuestion.passage}
              </div>
            )}

            {adaptiveData.selectedQuestion.imageUrl && (
              <div className="text-center">
                <img
                  src={adaptiveData.selectedQuestion.imageUrl}
                  alt="Minh họa câu hỏi"
                  className="max-h-60 mx-auto rounded border border-paper-kraft object-contain"
                />
              </div>
            )}

            {adaptiveData.selectedQuestion.audioUrl && (
              <div className="bg-paper-cream p-3 rounded border border-paper-kraft">
                <p className="font-body text-xs text-ink-medium mb-1">File âm thanh câu hỏi:</p>
                <audio controls className="w-full">
                  <source src={adaptiveData.selectedQuestion.audioUrl} type="audio/mpeg" />
                  Trình duyệt không hỗ trợ phát âm thanh.
                </audio>
              </div>
            )}

            <div className="font-exam font-bold text-ink-dark text-base">
              {adaptiveData.selectedQuestion.content}
            </div>

            <div className="space-y-2 font-exam text-sm">
              {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                const optKey = `option${opt}` as keyof AdaptiveQuestion;
                const optText = adaptiveData.selectedQuestion[optKey] as string;
                if (!optText) return null;

                const isSelected = selectedOpt === opt;
                const isAnswered = !!answerResult;
                const isCorrect = answerResult?.correctAnswer === opt;
                const isWrongChoice = isAnswered && isSelected && !answerResult.isCorrect;

                let btnClass = 'border-paper-kraft bg-paper-cream hover:bg-paper-kraft-light/40 text-ink-dark';

                if (isSelected && !isAnswered) {
                  btnClass = 'border-accent-coral bg-paper-rose/40 text-ink-dark font-bold ring-2 ring-accent-coral';
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
                    disabled={isAnswered || submittingAnswer}
                    onClick={() => setSelectedOpt(opt)}
                    className={`w-full p-3 text-left border rounded transition flex items-start gap-3 ${btnClass}`}
                  >
                    <span className="font-bold shrink-0">{opt}.</span>
                    <span className="flex-1">{optText}</span>
                  </button>
                );
              })}
            </div>

            {answerResult && (
              <div className={`p-4 rounded border ${answerResult.isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300'} space-y-2`}>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-bold">
                    {answerResult.isCorrect ? 'CHÍNH XÁC' : 'CHƯA CHÍNH XÁC'}
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
                  Cập nhật thông thạo kỹ năng thành công theo mô hình DAS3H.
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

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-paper-kraft">
              {!answerResult ? (
                <button
                  disabled={!selectedOpt || submittingAnswer}
                  onClick={submitAdaptiveAnswer}
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-body text-sm font-bold rounded shadow transition"
                >
                  {submittingAnswer ? 'Đang chấm bài...' : 'KIỂM TRA ĐÁP ÁN'}
                </button>
              ) : (
                <>
                  <button
                    onClick={loadQuestion}
                    className="px-5 py-2 bg-accent-coral hover:bg-accent-coral/90 text-white font-body text-xs font-bold rounded shadow transition"
                  >
                    LÀM TIẾP CÂU KHÁC CÙNG KỸ NĂNG
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-paper-cream hover:bg-paper-kraft-light/50 border border-paper-kraft text-ink-dark font-body text-xs font-bold rounded transition"
                  >
                    ĐÓNG & CẬP NHẬT HỒ SƠ
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
