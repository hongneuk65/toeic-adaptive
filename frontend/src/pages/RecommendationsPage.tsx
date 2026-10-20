import '../styles/recommendations-topics.css';
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { api } from '../lib/api';
import type { SkillMasteryItem, UserMasteryProfile } from '../types/mastery';
import { AdaptivePracticeModal } from '../components/AdaptivePracticeModal';
import { PageHeader } from '../components/ui/PageHeader';

interface TopicGroup {
  id: string; title: string; description: string; parts: number[]; skillIds: number[];
  observedSkillCount: number; totalSkillCount: number; estimatedSuccess: number | null;
  evidenceStatus: 'unassessed' | 'limited' | 'practiced';
  priority: 'diagnostic' | 'focus' | 'maintain'; recommendedSkillId: number | null;
  lesson: { id: number; title: string; part: number } | null;
}
type TopicProfile = UserMasteryProfile & { topicGroups?: TopicGroup[] };
type TopicFilter = 'all' | 'listening' | 'reading';
function TopicEvidence({ topic }: { topic: TopicGroup }) {
  if (topic.evidenceStatus === 'unassessed') return <span className="topic-evidence">Chưa đủ dữ liệu · bắt đầu bằng một lượt luyện</span>;
  return <span className="topic-evidence">{topic.estimatedSuccess === null ? 'Đang ghi nhận kết quả' : `Dự đoán đúng ${Math.round(topic.estimatedSuccess * 100)}%`}{topic.evidenceStatus === 'limited' ? ' · dữ liệu còn ít' : ''}</span>;
}
function TopicCard({ topic, index, onPractice, featured = false }: { topic: TopicGroup; index: number; onPractice: (id: number) => void; featured?: boolean }) {
  const status = topic.priority === 'focus' ? 'Củng cố tiếp' : topic.priority === 'diagnostic' ? 'Khám phá khả năng' : 'Duy trì nhịp học';
  return <article className={`topic-card${featured ? ' topic-card-featured' : ''}`}>
    <div className="topic-card-top"><span className="topic-step">{String(index + 1).padStart(2, '0')}</span><span className="topic-status">{status}</span></div>
    <p className="topic-parts">{topic.parts.map(part => `Part ${part}`).join(' · ')}</p>
    <h3>{topic.title}</h3><p className="topic-description">{topic.description}</p><TopicEvidence topic={topic} />
    <div className="topic-actions">
      {topic.recommendedSkillId !== null && <button className={featured ? 'primary-button' : 'secondary-button'} onClick={() => onPractice(topic.recommendedSkillId!)} aria-label={`Luyện ${topic.title}`}>Luyện chủ đề ↗</button>}
      {topic.lesson && <Link className="topic-text-link" to={`/theory?topic=${encodeURIComponent(topic.id)}&lesson=${topic.lesson.id}`}>Học lý thuyết →</Link>}
      {topic.recommendedSkillId === null && !topic.lesson && <Link className="topic-text-link" to={`/exam?parts=${topic.parts.join(',')}`}>Chọn bài luyện →</Link>}
    </div>
  </article>;
}
export function RecommendationsPage() {
  const load = useCallback((signal: AbortSignal) => api<TopicProfile>('/mastery/me', { signal }), []);
  const { data: profile, loading, error, reload } = useAsyncResource(load);
  const [practiceSession, setPracticeSession] = useState<{ title: string; skills: SkillMasteryItem[]; index: number; turn: number } | null>(null);
  const [filter, setFilter] = useState<TopicFilter>('all');
  const [expanded, setExpanded] = useState(false);
  const topics = profile?.topicGroups ?? [];
  const filtered = topics.filter(topic => filter === 'all' || topic.parts.some(part => filter === 'listening' ? part <= 4 : part >= 5));
  const visible = expanded ? filtered : filtered.slice(0, 6);
  const priorities = topics.slice(0, 3);
  const practice = (id: number) => { const topic = topics.find(item => item.recommendedSkillId === id); if (!topic || !profile) return; const ids = [id, ...topic.skillIds.filter(skillId => skillId !== id)]; const skills = ids.map(skillId => profile.skills.find(skill => skill.skillId === skillId)).filter((skill): skill is SkillMasteryItem => Boolean(skill)); if (skills.length) setPracticeSession({ title: topic.title, skills, index: 0, turn: 0 }); };
  return <div className="topic-recommendations page-stack">
    <PageHeader eyebrow="LỘ TRÌNH CỦA BẠN" title="Gợi ý học tiếp" description="Mỗi chủ đề kết nối các kỹ năng đi cùng nhau. Chọn một điểm bắt đầu cho buổi học hôm nay." />
    {loading && !profile ? <section className="topic-loading" role="status" aria-busy="true">Đang tổng hợp chủ đề phù hợp với bạn…<div className="skeleton-block" aria-hidden="true" /></section> : !profile ? <section role="alert" className="status-message"><h2>Chưa tải được gợi ý học</h2><p>{error || 'Vui lòng thử lại.'}</p><button className="primary-button" onClick={reload}>Thử lại</button></section> : <>
      {error && <p className="status-message" role="alert">Chưa cập nhật được tiến độ. <button className="text-action" onClick={reload}>Thử lại</button></p>}
      <section aria-labelledby="today-topics-title">
        <div className="topic-section-heading"><div><p className="topic-kicker">BẮT ĐẦU TỪ ĐÂY</p><h2 id="today-topics-title">Ưu tiên cho buổi học này</h2></div><span className="topic-heading-note">Tối đa 3 hướng để bạn dễ chọn</span></div>
        {priorities.length ? <div className="topic-priorities">{priorities.map((topic, index) => <TopicCard key={topic.id} topic={topic} index={index} onPractice={practice} featured={index === 0} />)}</div> : <div className="topic-empty"><h3>Chưa có chủ đề phù hợp</h3><p>Bạn vẫn có thể chọn bài từ thư viện lý thuyết hoặc luyện đề.</p><Link className="secondary-button" to="/theory">Mở thư viện lý thuyết</Link></div>}
      </section>
      <details className="topic-browse">
        <summary className="topic-section-heading"><h2>Khám phá tất cả chủ đề</h2><span>{topics.length} chủ đề · Mở để xem</span></summary>
        <div className="topic-section-heading"><div><p className="topic-kicker">BỨC TRANH TỔNG THỂ</p><h2 id="browse-topics-title">Học theo chủ đề</h2></div><div className="topic-filters" role="group" aria-label="Lọc chủ đề">{([['all', 'Tất cả'], ['listening', 'Nghe'], ['reading', 'Đọc & ngữ pháp']] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setExpanded(false); }}>{label}</button>)}</div></div>
        <div className="topic-library">{visible.map(topic => <article key={topic.id} className="topic-library-item"><div><p className="topic-parts">{topic.parts.map(part => `P${part}`).join(' / ')}</p><h3>{topic.title}</h3><TopicEvidence topic={topic} /></div>{topic.recommendedSkillId !== null ? <button className="topic-open" onClick={() => practice(topic.recommendedSkillId!)} aria-label={`Mở luyện ${topic.title}`}><span aria-hidden="true">↗</span></button> : <Link className="topic-open" aria-label={`Xem lý thuyết ${topic.title}`} to={`/theory?topic=${encodeURIComponent(topic.id)}`}>→</Link>}</article>)}</div>
        {!filtered.length && <p className="topic-empty">Chưa có chủ đề trong nhóm này.</p>}
        {filtered.length > 6 && <button className="secondary-button topic-show-more" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Thu gọn chủ đề' : `Xem thêm ${filtered.length - 6} chủ đề`}</button>}
        <p className="topic-footnote">Ước lượng chỉ tổng hợp các kỹ năng đã luyện trong chủ đề, không phải điểm TOEIC. Chưa luyện không đồng nghĩa với yếu.</p>
      </details>
      <section className="topic-next-paths" aria-label="Các cách học khác"><Link to="/flashcards"><span className="topic-path-icon" aria-hidden="true">Aa</span><div><h2>Ôn từ vựng</h2><p>Tiếp tục với bộ từ và các thẻ đến hạn.</p></div><span aria-hidden="true">→</span></Link><Link to="/exam"><span className="topic-path-icon" aria-hidden="true">✓</span><div><h2>Kiểm tra trong bài thi</h2><p>Luyện từng Part hoặc ghép một bài thi thử.</p></div><span aria-hidden="true">→</span></Link></section>
    </>}
    {practiceSession && <AdaptivePracticeModal key={`${practiceSession.skills[practiceSession.index].skillId}-${practiceSession.turn}`} skill={practiceSession.skills[practiceSession.index]} contextLabel={practiceSession.title} onNextQuestion={() => setPracticeSession(current => current ? { ...current, index: (current.index + 1) % current.skills.length, turn: current.turn + 1 } : null)} onClose={() => setPracticeSession(null)} onAnswerRecorded={reload} />}
  </div>;
}
