import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { useAsyncResource } from '../../hooks/useAsyncResource';
import type { PersonalizedRoadmapResult } from '../../types/rag';

export function PriorityRoadmapSection({ onPracticeSkill }: { onPracticeSkill(skillId: number, skillName: string): void }) {
  const resource = useAsyncResource(useCallback((signal: AbortSignal) => api<PersonalizedRoadmapResult>('/rag/priority-roadmap', { signal }), []));
  const [filter, setFilter] = useState('ALL');
  const navigate = useNavigate();
  if (resource.loading && !resource.data) return <p role="status" className="text-sm">Đang tải thứ tự ôn tập…</p>;
  if (!resource.data) return <p role="alert">{resource.error || 'Chưa tải được gợi ý.'} <button className="text-action" onClick={resource.reload}>Thử lại</button></p>;
  const steps = resource.data.prioritySteps.filter(step => filter === 'ALL' || step.priority.startsWith(filter));
  return <section className="space-y-3">
    <label className="block text-sm">Nhóm kỹ năng<select className="form-input mt-2 sm:max-w-xs" value={filter} onChange={event => setFilter(event.target.value)}><option value="ALL">Tất cả</option><option value="P0">Cần củng cố</option><option value="P1">Ôn tiếp</option><option value="P2">Duy trì</option></select></label>
    <ul className="divide-y divide-paper-kraft/50">{steps.slice(0, 15).map(step => <li key={step.skillId} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-semibold">{step.skillName}</h3><p className="mt-1 text-sm text-ink-medium">Part {step.part}</p>{step.recommendedLesson && <button className="text-action mt-2 text-sm" onClick={() => navigate('/theory')}>{step.recommendedLesson.title}</button>}</div><button className="secondary-button" onClick={() => onPracticeSkill(step.skillId, step.skillName)}>Luyện tập</button></li>)}</ul>
    {!steps.length && <p className="text-sm text-ink-medium">Không có kỹ năng trong nhóm này. Chọn Tất cả để xem tiếp.</p>}
  </section>;
}