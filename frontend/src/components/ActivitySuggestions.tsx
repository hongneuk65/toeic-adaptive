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
const priorities = { focus: 'Củng cố', review: 'Ôn lại', diagnostic: 'Bắt đầu / Khám phá' };

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
  return <section aria-labelledby={id} className="rounded-xl border border-paper-kraft bg-paper-white p-4 sm:p-5 space-y-4">
    <div><h2 id={id} className="text-lg font-semibold">{section ? 'Gợi ý học cho bạn' : 'Học tiếp trong từng phần'}</h2><p className="text-sm text-ink-medium">{section ? `${labels[section]} · ` : ''}Chọn bài theo tiến độ và kết quả học của bạn.</p></div>
    {!loading && !error && !compact && data?.learnerProfile && <div className="rounded-lg bg-paper-cream p-3 space-y-1"><p className="text-sm font-semibold">{data.learnerProfile.label}</p><p className="text-sm text-ink-medium">{data.learnerProfile.description}</p></div>}
    {loading ? <p role="status" className="text-sm text-ink-medium">Đang tìm bài học phù hợp…</p> : error ? <p className="text-sm text-ink-medium">Chưa tải được gợi ý. Bạn vẫn có thể chọn bài bên dưới. <button className="text-action min-h-11" onClick={reload}>Thử lại gợi ý</button></p> : <div className={section ? 'space-y-3' : 'grid gap-4 md:grid-cols-2'}>{sections.map(key => { const items = (data?.sections[key] ?? []).filter(item => item.href !== excludeHref && !excludeHrefs.includes(item.href)).slice(0, compact ? 2 : 3); return <div key={key} className="min-w-0 space-y-2">
      {!section && <h3 className="font-semibold">{labels[key]}</h3>}
      {items.length ? <ul className="space-y-2">{items.map(item => <li key={item.id} className="rounded-lg border border-paper-kraft p-3"><span className="text-xs text-ink-medium">{priorities[item.priority]}</span><Link className="block break-words font-semibold underline underline-offset-4 py-1" to={item.href}>{item.title}</Link><p className="text-sm text-ink-medium break-words">{item.reason}</p>{item.dueAt && Number.isFinite(Date.parse(item.dueAt)) && <p className="text-xs text-ink-medium mt-1">Mốc ôn: <time dateTime={item.dueAt}>{new Date(item.dueAt).toLocaleDateString('vi-VN')}</time></p>}</li>)}</ul> : <p className="text-sm text-ink-medium">Chưa có bài phù hợp để gợi ý. Hãy chọn bài trong thư viện để bắt đầu.</p>}
    </div>; })}</div>}
  </section>;
}
