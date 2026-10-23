import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { api } from '../lib/api';

interface SupportResponse {
  version: 'practice-support-v1';
  skillId: number;
  skillName: string;
  steps: { title: string; body: string }[];
  lesson: { id: number; title: string; part: number } | null;
}

interface Props { questionId: number; skillId: number; attemptId: string; onPracticeAgain: () => void; }

function SupportSteps({ questionId, skillId, attemptId }: Omit<Props, 'onPracticeAgain'>) {
  const load = useCallback((signal: AbortSignal) => api<SupportResponse>('/das3h/practice-support', {
    method: 'POST', signal, data: { questionId, skillId, attemptId },
  }), [questionId, skillId, attemptId]);
  const { data, loading, error, reload } = useAsyncResource(load);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const headings = useRef<(HTMLHeadingElement | null)[]>([]);
  useEffect(() => {
    if (visibleSteps > 1) headings.current[visibleSteps - 1]?.focus();
  }, [visibleSteps]);
  if (loading) return <p role="status">Đang chuẩn bị hướng dẫn…</p>;
  if (!data || error) return <div><p role="alert">{error || 'Chưa tải được hướng dẫn.'}</p><button className="secondary-button" onClick={reload}>Thử lại hướng dẫn</button></div>;
  return <div className="space-y-3">
    <p className="text-sm text-ink-medium">Cách tiếp cận cho kỹ năng {data.skillName}. Một câu trả lời chưa đủ để kết luận nguyên nhân bạn làm sai.</p>
    {data.steps.length > 0 ? <>
      <ol className="space-y-3 list-decimal pl-5" aria-label="Các bước củng cố">
        {data.steps.slice(0, visibleSteps).map((step, index) => <li key={index}><h4 ref={element => { headings.current[index] = element; }} tabIndex={-1} className="font-semibold">{step.title}</h4><p className="text-sm text-ink-medium">{step.body}</p></li>)}
      </ol>
      <p role="status" className="text-xs text-ink-medium">Đã mở {Math.min(visibleSteps, data.steps.length)} / {data.steps.length} bước</p>
      {visibleSteps < data.steps.length && <button className="secondary-button" onClick={() => setVisibleSteps(value => value + 1)}>Bước tiếp theo</button>}
    </> : <p className="text-sm">Chưa có hướng dẫn từng bước cho kỹ năng này. Bạn có thể xem lời giải hoặc luyện thêm.</p>}
    {data.lesson && <Link className="block underline min-h-11 py-2 text-sm" to={`/theory?lesson=${data.lesson.id}`}>Ôn lý thuyết: {data.lesson.title} →</Link>}
  </div>;
}

export function PracticeSupport({ questionId, skillId, attemptId, onPracticeAgain }: Props) {
  const [opened, setOpened] = useState(false);
  const panelId = useId();
  return <section aria-label="Củng cố sau câu trả lời" className="border border-paper-kraft rounded p-4 space-y-3 bg-paper-cream">
    <h3 className="font-semibold">Cùng xem lại cách làm</h3>
    <p className="text-sm text-ink-medium">Xem từng bước rồi thử một câu khác cùng kỹ năng.</p>
    <button className="secondary-button" aria-expanded={opened} aria-controls={panelId} onClick={() => setOpened(value => !value)}>{opened ? 'Thu gọn hướng dẫn' : 'Hướng dẫn từng bước'}</button>
    <div id={panelId} hidden={!opened}>{opened && <SupportSteps questionId={questionId} skillId={skillId} attemptId={attemptId} />}</div>
    <button className="secondary-button" onClick={onPracticeAgain}>Luyện thêm kỹ năng này</button>
  </section>;
}
