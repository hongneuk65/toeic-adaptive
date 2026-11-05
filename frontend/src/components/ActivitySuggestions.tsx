import { LEARNING_PROGRESS_UPDATED } from '../lib/learning-progress';
import { useCallback, useEffect, useId } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';

type Section = 'theory' | 'vocabulary' | 'listening' | 'reading';
interface Activity { id: string; title: string; href: string; reason: string; evidence: string; priority: 'focus' | 'review' | 'diagnostic'; dueAt?: string }
interface Activities {
  generatedAt: string;
  learnerProfile?: { stage: 'unassessed' | 'foundation' | 'developing' | 'consolidating'; label: string; description: string; observedSkills: number; practiceCount: number };
  sections: Record<Section, Activity[]>;
}
const labels: Record<Section, string> = { theory: 'Kiến thức', vocabulary: 'Từ vựng', listening: 'Luyện nghe', reading: 'Luyện đọc' };
const priorities = { focus: 'Củng cố', review: 'Ôn lại', diagnostic: 'Khám phá' };

export function ActivitySuggestions({ section, compact = false, excludeHref, excludeHrefs = [] }: { section?: Section; compact?: boolean; excludeHref?: string; excludeHrefs?: string[] }) {
  const id = useId();
  const load = useCallback((signal: AbortSignal) => api<Activities>('/mastery/activities', { signal }), []);
  const { data, loading, error, reload } = useAsyncResource(load);
  useEffect(() => {
    window.addEventListener('focus', reload);
    window.addEventListener(LEARNING_PROGRESS_UPDATED, reload);
    return () => {
      window.removeEventListener('focus', reload);
      window.removeEventListener(LEARNING_PROGRESS_UPDATED, reload);
    };
  }, [reload]);
  const sections: Section[] = section ? [section] : ['theory', 'vocabulary', 'listening', 'reading'];
  return <section aria-labelledby={id} className="activity-suggestions">
    <div className="activity-suggestions-heading"><h2 id={id}>{section ? 'Gợi ý học cho bạn' : 'Học tiếp'}</h2></div>
    {!loading && !error && !compact && data?.learnerProfile && <details className="activity-suggestions-profile"><summary className="cursor-pointer py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">{data.learnerProfile.label}</summary><p>{data.learnerProfile.description}</p></details>}
    {loading ? <p role="status" className="text-sm text-ink-medium">Đang tải gợi ý…</p> : error ? <p className="text-sm text-ink-medium">Chưa tải được gợi ý. <button className="study-action-button" onClick={reload}>Thử lại</button></p> : <div className={section ? '' : 'grid gap-4 md:grid-cols-2'}>{sections.map(key => { const items = (data?.sections[key] ?? []).filter(item => item.href !== excludeHref && !excludeHrefs.includes(item.href)).slice(0, compact ? 2 : 3); return <div key={key} className="min-w-0 space-y-2">
      {!section && <h3 className="font-semibold">{labels[key]}</h3>}
      {items.length ? <ul className="activity-suggestions-items">{items.map(item => <li key={item.id} className="min-w-0"><Link className="activity-suggestion-link" aria-label={item.title} to={item.href}><span className="activity-suggestion-priority">{priorities[item.priority]}</span><strong>{item.title}</strong><p>{item.reason}</p>{item.dueAt && Number.isFinite(Date.parse(item.dueAt)) && <span className="text-xs text-ink-medium">Mốc ôn: <time dateTime={item.dueAt}>{new Date(item.dueAt).toLocaleDateString('vi-VN')}</time></span>}</Link></li>)}</ul> : <p className="text-sm text-ink-medium">Chọn bài trong thư viện để bắt đầu.</p>}
    </div>; })}</div>}
  </section>;
}
