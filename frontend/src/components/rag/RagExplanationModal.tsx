import React, { lazy, Suspense, useCallback, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiStream } from '../../lib/api';
import { AiMarkdown } from './AiMarkdown';
import { readJsonSse } from '../../lib/sse';
import { useDialogFocus } from '../../hooks/useDialogFocus';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { PersonalizedExplanationResult } from '../../types/rag';

const AdaptivePracticeModal = lazy(() => import('../AdaptivePracticeModal').then(module => ({ default: module.AdaptivePracticeModal })));

interface RagExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  questionId: number | null;
  selectedAnswer: string;
  attemptId?: number;
  onAskTutor?: (questionId: number, skillCode?: string) => void;
}

export const RagExplanationModal: React.FC<RagExplanationModalProps> = ({
  isOpen,
  onClose,
  questionId,
  selectedAnswer,
  attemptId,
  onAskTutor,
}) => {
  const navigate = useNavigate();
  const dialog = useRef<HTMLDivElement>(null);
  const [practiceQuestionId, setPracticeQuestionId] = useState<number | null>(null);
  const practiceOpen = isOpen && practiceQuestionId === questionId;
  useDialogFocus(dialog, isOpen && !practiceOpen, onClose);
  const [preference, setPreference] = useState<{ questionId: number | null; mode: 'auto' | 'simpler' | 'example' | 'deeper' }>({ questionId: null, mode: 'auto' });
  const mode = preference.questionId === questionId ? preference.mode : 'auto';
  const requestKey = useMemo(() => ({ isOpen, questionId, selectedAnswer, attemptId, mode }), [isOpen, questionId, selectedAnswer, attemptId, mode]);
  const [progress, setProgress] = useState<{ key: typeof requestKey; text: string }>();
  const load = useCallback(async (signal: AbortSignal) => {
    if (!requestKey.isOpen || !requestKey.questionId) return null;
    setProgress({ key: requestKey, text: '' });
    const response = await apiStream('/rag/explain-error-stream', {
      questionId: requestKey.questionId, selectedAnswer: requestKey.selectedAnswer || 'CHƯA_CHỌN',
      attemptId: requestKey.attemptId, mode: requestKey.mode,
    }, signal);
    let text = '';
    let result: PersonalizedExplanationResult | undefined;
    for await (const event of readJsonSse<{ chunk?: string; result?: PersonalizedExplanationResult }>(response)) {
      signal.throwIfAborted();
      if (event.chunk) {
        text += event.chunk;
        setProgress({ key: requestKey, text });
      }
      if (event.result) result = event.result;
    }
    if (!result) throw new Error('Chưa nhận đủ lời giải. Vui lòng thử lại.');
    return result;
  }, [requestKey]);
  const { data, loading, error, reload } = useAsyncResource(load);
  const partialText = progress?.key === requestKey ? progress.text : '';

  if (!isOpen || !questionId) return null;

  if (practiceOpen && data?.nextPractice) {
    const practice = data.nextPractice;
    return <Suspense fallback={<div role="status" className="fixed inset-0 z-50 flex items-center justify-center bg-paper-cream">Đang mở bài luyện…</div>}>
      <AdaptivePracticeModal
        key={questionId}
        skill={{ skillId: practice.skillId, skillName: practice.skillName, skillCode: data.learnerMastery?.skillCode ?? '', part: practice.part, masteryScore: data.learnerMastery?.masteryScore ?? 0, practiceCount: 0, lastPracticed: null }}
        contextLabel="Luyện tiếp sau lời giải"
        onClose={() => setPracticeQuestionId(null)}
        onAnswerRecorded={() => {}}
      />
    </Suspense>;
  }

  const displaySelected =
    !(data?.selectedAnswer ?? selectedAnswer) || (data?.selectedAnswer ?? selectedAnswer) === 'CHƯA_CHỌN'
      ? 'Chưa chọn'
      : `Đáp án (${data?.selectedAnswer ?? selectedAnswer})`;

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div ref={dialog} role="dialog" aria-modal="true" aria-label="Giải thích câu hỏi" tabIndex={-1} className="relative w-full max-w-2xl max-h-[90vh] bg-paper-white border border-paper-kraft shadow-paper-light rounded-xl flex flex-col overflow-hidden">
        <div className="staple top-2 left-6" />
        <div className="staple top-2 right-6" />

        <div className="p-4 border-b border-paper-kraft bg-paper-cream flex items-center justify-between">
          <div>
            <h2 className="font-hand text-xl font-bold text-ink-dark">
              Giải thích câu hỏi
            </h2>
            <p className="font-mono text-xs text-ink-light">
              Quy tắc và dẫn chứng liên quan
            </p>
          </div>
          <button
            onClick={onClose}
            className="px-3 h-8 flex items-center justify-center rounded border border-paper-kraft text-ink-medium hover:bg-paper-kraft-light/50 font-mono text-sm"
          >
            Đóng
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 font-body">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Điều chỉnh cách giải thích">
            {([{ mode: 'auto', label: 'Tự động' }, { mode: 'simpler', label: 'Giải thích dễ hơn' }, { mode: 'example', label: 'Cho ví dụ' }, { mode: 'deeper', label: 'Giải thích sâu hơn' }] as const).map(item => <button key={item.mode} type="button" aria-pressed={mode === item.mode} disabled={loading} onClick={() => setPreference({ questionId, mode: item.mode })} className="rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 aria-pressed:bg-slate-800 aria-pressed:text-white disabled:opacity-50">{item.label}</button>)}
          </div>
          <p className="text-xs text-slate-500">Chỉ thay đổi cách giải thích, không cập nhật năng lực hay điểm học tập.</p>
          {loading && !partialText && (
            <div className="py-16 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
              <p className="font-hand text-lg text-ink-medium">
                Đang chuẩn bị và kiểm tra lời giải…
              </p>
            </div>
          )}

          {(loading || error) && partialText && (
            <div className="p-4 bg-paper-cream border border-paper-kraft rounded text-sm leading-relaxed">
              <AiMarkdown content={partialText} streaming={loading} />
              {loading && <p role="status" className="mt-3 text-xs text-ink-light animate-pulse">AI đang viết tiếp lời giải...</p>}
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
              <p className="font-bold mb-1">Không thể tải phân tích thông minh:</p>
              <p>{error}</p>
              <button onClick={reload} className="mt-2 underline font-bold">Thử lại</button>
            </div>
          )}

          {data && !loading && (
            <>
              <div role="status" className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                <p>{data.presentation?.description}</p>
                <p>{data.knowledgeNotice}</p>
                {data.generationStatus === 'stored_only' && <p>AI chưa cung cấp được phản hồi hợp lệ. Đang hiển thị thông tin và lời giải lưu sẵn, chưa được thẩm định.</p>}
                {data.answerOrigin === 'practice_input' && <p>Đây là lựa chọn ở chế độ luyện tập, chưa xác thực từ một bài thi đã nộp.</p>}
                {data.contextWarnings?.map(warning => <p key={warning}>{warning}</p>)}
                {!!data.learnerEvidence?.length && <details className="mt-2"><summary className="cursor-pointer font-semibold">Căn cứ điều chỉnh cách giải thích</summary><p>DAS3H là dự đoán, không phải kết luận trình độ đã được kiểm chứng.</p><ul className="mt-1 space-y-1">{data.learnerEvidence.map(skill => <li key={skill.id}>{skill.name}: {skill.attempts} lượt / {skill.distinctQuestions} câu khác nhau trong 30 ngày; {skill.recentAttempts} lượt trong 14 ngày. {skill.status === 'sufficient' ? 'Đủ điều kiện của quy tắc trình bày thử nghiệm.' : skill.status === 'stale' ? 'Lịch sử chưa đủ gần đây.' : 'Chưa đủ dữ liệu để điều chỉnh tự động.'}</li>)}</ul></details>}
              </div>
              <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-amber-900">Part {data.part}</span>
                  {data.learnerMastery && (
                    <span className="px-2 py-0.5 bg-amber-200/70 text-amber-950 font-bold rounded">
                      {data.learnerMastery.skillName}
                    </span>
                  )}
                </div>

              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div
                  className={`p-2.5 rounded border ${
                    data.isCorrect
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-bold'
                      : 'bg-rose-50 border-rose-300 text-rose-950 font-bold'
                  }`}
                >
                  <span className="block text-[10px] uppercase opacity-75">Bạn đã chọn:</span>
                  <span className="text-sm">{displaySelected}</span>
                  <span className="ml-1 text-xs">{data.isCorrect ? '(Đúng)' : '(Chưa đúng)'}</span>
                </div>
                <div className="p-2.5 rounded border bg-emerald-50 border-emerald-300 text-emerald-950 font-bold">
                  <span className="block text-[10px] uppercase opacity-75">Đáp án chính xác:</span>
                  <span className="text-sm">Đáp án ({data.correctAnswer})</span>
                </div>
              </div>

              {/* 4 Lớp Giải Thích Sư Phạm */}
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="p-3 bg-paper-white border border-rose-200 rounded space-y-1">
                  <h3 className="font-bold text-rose-950 text-xs">
                    1. Lựa chọn và điểm cần đối chiếu
                  </h3>
                  <div className="text-ink-dark leading-relaxed">
                    <AiMarkdown content={data.sections.misconceptionAnalysis} />
                  </div>
                </div>

                <div className="p-3 bg-paper-white border border-emerald-200 rounded space-y-1">
                  <h3 className="font-bold text-emerald-950 text-xs">
                    2. Giải thích đáp án
                  </h3>
                  <div className="text-ink-dark leading-relaxed">
                    <AiMarkdown content={data.sections.correctAnswerExplanation} />
                  </div>
                </div>

                <div className="p-3 bg-paper-white border border-indigo-200 rounded space-y-1">
                  <h3 className="font-bold text-indigo-950 text-xs">
                    3. Quy tắc và ví dụ
                  </h3>
                  <div className="text-ink-dark leading-relaxed">
                    <AiMarkdown content={data.sections.keyTakeawayRule} />
                  </div>
                </div>

                <div className="p-3 bg-paper-white border border-slate-300 rounded space-y-1">
                  <h3 className="font-bold text-slate-950 text-xs">
                    4. Bước học tiếp theo
                  </h3>
                  <div className="text-ink-dark leading-relaxed">
                    <AiMarkdown content={data.sections.recommendedAction} />
                  </div>
                  {(data.nextPractice || data.recommendedLesson) && <div className="flex flex-wrap gap-2 pt-2">
                    {data.nextPractice && <button type="button" onClick={() => setPracticeQuestionId(questionId)} className="rounded border border-slate-800 bg-slate-900 px-3 py-2 font-semibold text-white hover:bg-slate-800">Luyện cùng kỹ năng</button>}
                    {data.recommendedLesson && <button type="button" onClick={() => { onClose(); navigate(`/theory?lesson=${data.recommendedLesson!.id}`); }} className="rounded border border-paper-kraft px-3 py-2 font-semibold text-ink-dark hover:bg-paper-cream">Ôn bài: {data.recommendedLesson.title}</button>}
                  </div>}
                  {data.nextPractice && <p className="pt-1 text-ink-light">Luyện từ ngân hàng câu hỏi theo kỹ năng {data.nextPractice.skillName}. Gửi đáp án sẽ ghi nhận một lượt luyện tập.</p>}
                </div>
              </div>

              {data.retrievedSources && data.retrievedSources.length > 0 && (
                <div className="pt-2 border-t border-paper-kraft space-y-1.5">
                  <span className="font-mono text-[10px] font-bold text-ink-light uppercase">
                    Tài liệu tham chiếu (RAG):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {data.retrievedSources.map((s, idx) => (
                      <div
                        key={idx}
                        className="px-2 py-0.5 bg-paper-cream border border-paper-kraft rounded text-[11px] text-ink-dark flex items-center gap-1"
                      >
                        <span className="text-ink-light font-bold">•</span>
                        <span>{s.title}</span>
                        {s.version && <span className="text-ink-light">· {s.version}</span>}
                        {s.sourceUri?.startsWith('https://') && <a href={s.sourceUri} target="_blank" rel="noopener noreferrer" className="underline">Nguồn</a>}
                        <span className="text-[10px] text-ink-light font-mono">[{s.category}]</span>
                        {s.lessonId && (
                          <button
                            onClick={() => {
                              onClose();
                              navigate(`/theory?lesson=${s.lessonId}`);
                            }}
                            className="ml-1 text-slate-900 underline font-bold hover:text-accent-coral"
                          >
                            Đọc bài
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-paper-kraft bg-paper-cream flex items-center justify-between gap-3">
          {onAskTutor && <button
            onClick={() => {
              if (onAskTutor && questionId) {
                onAskTutor(questionId, data?.learnerMastery?.skillCode);
              }
              onClose();
            }}
            className="px-3.5 py-1.5 border border-slate-700 bg-white hover:bg-paper-cream text-slate-900 font-body text-xs font-bold rounded shadow-sm"
          >
            Hỏi Trợ lý AI Tutor
          </button>}

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-body text-xs font-bold rounded shadow transition"
          >
            Đã hiểu bài
          </button>
        </div>
      </div>
    </div>
  );
};
