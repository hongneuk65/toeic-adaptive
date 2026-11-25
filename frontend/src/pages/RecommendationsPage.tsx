import { LEARNING_PROGRESS_UPDATED } from '../lib/learning-progress';
import { LearnerOverview } from '../components/learning/LearnerOverview';
import { LearningProgress } from '../components/learning/LearningProgress';
import { Pagination } from '../components/ui/Pagination';
import '../styles/recommendations-topics.css';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { api } from '../lib/api';
import type { LearningPlanItem, MistakeReviewSkill, SkillMasteryItem, UserMasteryProfile } from '../types/mastery';
import { AdaptivePracticeModal } from '../components/AdaptivePracticeModal';
import { PageHeader } from '../components/ui/PageHeader';
import { MistakeReview } from '../components/MistakeReview';

interface TopicGroup {
  id: string; title: string; description: string; parts: number[]; skillIds: number[];
  observedSkillCount: number; totalSkillCount: number; estimatedSuccess: number | null;
  evidenceStatus: 'unassessed' | 'limited' | 'practiced';
  priority: 'diagnostic' | 'focus' | 'maintain'; recommendedSkillId: number | null;
  focusSkillIds?: number[];
  practiceSkillIds?: number[];
  lesson: { id: number; title: string; part: number } | null;
}
type TopicProfile = UserMasteryProfile & { topicGroups?: TopicGroup[] };
type TopicFilter = 'all' | 'listening' | 'reading';
const PLAN_STATUS = { diagnostic: 'Khám phá', focus: 'Củng cố', review: 'Đến hạn ôn', maintain: 'Duy trì' };
function PlanCard({ item, index, availableSkills, onPractice }: { item: LearningPlanItem; index: number; availableSkills: SkillMasteryItem[]; onPractice: (id: number) => void }) {
  const due = item.reviewDueAt ? new Date(item.reviewDueAt) : null;
  const dueLabel = due && Number.isFinite(due.getTime()) ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(due) : null;
  return <article className={`topic-card learning-plan-card${index === 0 ? ' topic-card-featured' : ''}`}>
    <div className="topic-card-top"><span className="topic-step">{String(index + 1).padStart(2, '0')}</span><span className="topic-status">{PLAN_STATUS[item.priority]}</span></div>
    <p className="topic-parts">Part {item.part}</p><h3>{item.skillName}</h3>
    {dueLabel && <p className="topic-evidence">Cần ôn từ ngày <time dateTime={item.reviewDueAt!}>{dueLabel}</time></p>}
    <div className="topic-actions">
      <button className={index === 0 ? 'primary-button' : 'secondary-button'} onClick={() => onPractice(item.skillId)} disabled={!availableSkills.some(skill => skill.skillId === item.skillId)} aria-label={`Luyện ${item.skillName}`}>Luyện kỹ năng</button>
      {item.lesson && <Link className="topic-text-link study-action-button" to={`/theory?lesson=${item.lesson.id}`}>Học kiến thức</Link>}
    </div>
  </article>;
}
function TopicEvidence({ topic }: { topic: TopicGroup }) {
  if (topic.evidenceStatus === 'unassessed') return <span className="topic-evidence">Chưa đủ dữ liệu</span>;
  return <span className="topic-evidence">{topic.estimatedSuccess === null ? 'Đang ghi nhận kết quả' : `Dự đoán đúng ${Math.round(topic.estimatedSuccess * 100)}%`}{topic.evidenceStatus === 'limited' ? ' · dữ liệu còn ít' : ''}</span>;
}
function TopicCard({ topic, index, onPractice, featured = false, focusNames }: { topic: TopicGroup; index: number; onPractice: (topic: TopicGroup) => void; featured?: boolean; focusNames: string[] }) {
  const status = topic.priority === 'focus' ? 'Củng cố' : topic.priority === 'diagnostic' ? 'Khám phá' : 'Duy trì';
  return <article className={`topic-card${featured ? ' topic-card-featured' : ''}`}>
    <div className="topic-card-top">
      <span className="topic-step">{featured ? 'Ưu tiên hôm nay' : String(index + 1).padStart(2, '0')}</span>
      <span className="topic-status">{status}</span>
    </div>
    <p className="topic-parts">{topic.parts.map(part => `Part ${part}`).join(' · ')}</p>
    <h3>{topic.title}</h3>
    {topic.practiceSkillIds ? <>
      {featured && topic.description && <p className="topic-description">{topic.description}</p>}
      {focusNames.length > 0 ? <p className="topic-focus"><strong>Ôn nhiều hơn</strong><span>{focusNames.slice(0, 2).join(' · ')}{focusNames.length > 2 ? ` · +${focusNames.length - 2} kỹ năng` : ''}</span></p>
        : topic.priority === 'diagnostic' && <TopicEvidence topic={topic} />}
    </> : <TopicEvidence topic={topic} />}
    <div className="topic-actions">
      {topic.recommendedSkillId !== null && <button className={featured ? 'primary-button' : 'secondary-button'} onClick={() => onPractice(topic)} aria-label={`Luyện ${topic.title}`}>{featured ? 'Bắt đầu luyện' : 'Luyện chủ đề'}</button>}
      {topic.lesson && <Link className="topic-text-link study-action-button" to={`/theory?topic=${encodeURIComponent(topic.id)}&lesson=${topic.lesson.id}`}>Học kiến thức</Link>}
      {topic.recommendedSkillId === null && !topic.lesson && <Link className="topic-text-link study-action-button" to={`/exam?parts=${topic.parts.join(',')}`}>Chọn bài luyện</Link>}
    </div>
  </article>;
}
export function RecommendationsPage() {
  const load = useCallback((signal: AbortSignal) => api<TopicProfile>('/mastery/me', { signal }), []);
  const { data: profile, loading, error, reload } = useAsyncResource(load);
  useEffect(() => {
    window.addEventListener('focus', reload);
    window.addEventListener(LEARNING_PROGRESS_UPDATED, reload);
    return () => { window.removeEventListener('focus', reload); window.removeEventListener(LEARNING_PROGRESS_UPDATED, reload); };
  }, [reload]);
  const [practiceSession, setPracticeSession] = useState<{ title: string; skills: SkillMasteryItem[]; index: number; turn: number; reviewQuestionIds?: number[] } | null>(null);
  const [filter, setFilter] = useState<TopicFilter>('all');
  const [page, setPage] = useState(1);
  const topics = profile?.topicGroups ?? [];
  const filtered = topics.filter(topic => filter === 'all' || topic.parts.some(part => filter === 'listening' ? part <= 4 : part >= 5));
  const totalPages = Math.max(1, Math.ceil(filtered.length / 6));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * 6, currentPage * 6);
  const groupedPriorities = topics.filter(topic => topic.practiceSkillIds?.length || (topic.practiceSkillIds && topic.lesson));
  const priorities = (groupedPriorities.length ? groupedPriorities : topics).slice(0, 3);
  const skillsById = new Map(profile?.skills.map(skill => [skill.skillId, skill]));
  const learningPlan = profile?.learningPlan;
  const planPriorities = learningPlan?.items.slice(0, 3) ?? [];
  const practiceSkill = (id: number) => {
    const skill = profile?.skills.find(item => item.skillId === id);
    if (skill) setPracticeSession({ title: skill.skillName, skills: [skill], index: 0, turn: 0 });
  };
  const reviewMistakes = (item: MistakeReviewSkill) => {
    const skill = skillsById.get(item.skillId) ?? { skillId: item.skillId, skillCode: '', skillName: item.skillName, part: item.part, masteryScore: item.masteryScore ?? 0, practiceCount: 0, lastPracticed: null };
    setPracticeSession({ title: 'Ôn câu hay sai', skills: [skill], index: 0, turn: 0, reviewQuestionIds: item.questions.map(q => q.questionId) });
  };
  const practice = (topic: TopicGroup) => {
    const first = topic.recommendedSkillId;
    if (first === null) return;
    const ids = topic.practiceSkillIds ?? [first, ...topic.skillIds.filter(id => id !== first)];
    const skills = ids.flatMap(id => {
      const skill = skillsById.get(id);
      return skill ? [skill] : [];
    });
    if (skills.length) setPracticeSession({ title: topic.title, skills, index: 0, turn: 0 });
  };
  return <div className="topic-recommendations page-stack">
    <PageHeader variant="compact" title="Gợi ý học tiếp" actions={<Link className="secondary-button" to="/curriculum">Lộ trình học</Link>} />
    {loading && !profile ? <section className="topic-loading" role="status" aria-busy="true">Đang tải gợi ý…<div className="skeleton-block" aria-hidden="true" /></section> : !profile ? <section role="alert" className="status-message"><h2>Chưa tải được gợi ý học</h2><p>{error || 'Vui lòng thử lại.'}</p><button className="primary-button" onClick={reload}>Thử lại</button></section> : <>
      {error && <p className="status-message" role="alert">Chưa cập nhật được tiến độ. <button className="text-action" onClick={reload}>Thử lại</button></p>}
      <section className="recommendation-session" aria-labelledby="today-topics-title">
        <div className="topic-section-heading"><h2 id="today-topics-title">Buổi học tiếp theo</h2></div>
        {learningPlan && !groupedPriorities.length ? planPriorities.length ? <div className="topic-priorities">{planPriorities.map((item, index) => <PlanCard key={item.skillId} item={item} index={index} availableSkills={profile.skills} onPractice={practiceSkill} />)}</div> : <div className="topic-empty"><h3>Chưa có kỹ năng sẵn sàng để gợi ý</h3><p>Chọn bài từ thư viện.</p><Link className="secondary-button" to="/theory">Mở thư viện kiến thức</Link></div> : priorities.length ? <div className="topic-priorities topic-group-priorities">{priorities.map((topic, index) => <TopicCard key={topic.id} topic={topic} index={index} onPractice={practice} featured={index === 0} focusNames={(topic.focusSkillIds ?? []).filter(id => topic.practiceSkillIds?.includes(id)).flatMap(id => { const name = skillsById.get(id)?.skillName; return name ? [name] : []; })} />)}</div> : <div className="topic-empty"><h3>Chưa có chủ đề phù hợp</h3><p>Chọn bài từ thư viện.</p><Link className="secondary-button" to="/theory">Mở thư viện kiến thức</Link></div>}
      </section>
      <MistakeReview onReview={reviewMistakes} />
      <LearningProgress />
      <LearnerOverview skills={profile.skills} onPractice={practiceSkill} />
      <details className="topic-browse">
        <summary className="topic-section-heading"><h2>Chủ đề khác</h2><span>{topics.length} chủ đề</span></summary>
        <div className="topic-section-heading"><div className="topic-filters" role="group" aria-label="Lọc chủ đề">{([['all', 'Tất cả'], ['listening', 'Nghe'], ['reading', 'Đọc & ngữ pháp']] as const).map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => { setFilter(value); setPage(1); }}>{label}</button>)}</div></div>
        <div className="topic-library">{visible.map(topic => <article key={topic.id} className="topic-library-item"><div><p className="topic-parts">{topic.parts.map(part => `P${part}`).join(' / ')}</p><h3>{topic.title}</h3><TopicEvidence topic={topic} /></div>{topic.recommendedSkillId !== null ? <button className="topic-open" onClick={() => practice(topic)} aria-label={`Mở luyện ${topic.title}`}>Mở</button> : <Link className="topic-open" aria-label={`Xem kiến thức ${topic.title}`} to={`/theory?topic=${encodeURIComponent(topic.id)}`}>Mở</Link>}</article>)}</div>
        {!filtered.length && <p className="topic-empty">Chưa có chủ đề trong nhóm này.</p>}
        <Pagination page={currentPage} totalPages={totalPages} onPageChange={setPage} label="Trang chủ đề" />
        <p className="topic-footnote">Ước lượng trên kỹ năng đã luyện, không phải điểm TOEIC.</p>
      </details>
      <section className="topic-next-paths" aria-label="Các cách học khác"><Link to="/flashcards"><span className="topic-path-icon" aria-hidden="true">Aa</span><div><h2>Ôn từ vựng</h2></div></Link><Link to="/exam"><span className="topic-path-icon" aria-hidden="true">✓</span><div><h2>Luyện đề</h2></div></Link></section>
    </>}
    {practiceSession && <AdaptivePracticeModal key={`${practiceSession.skills[practiceSession.index].skillId}-${practiceSession.turn}`} skill={practiceSession.skills[practiceSession.index]} contextLabel={practiceSession.title} reviewQuestionIds={practiceSession.reviewQuestionIds} onNextQuestion={() => setPracticeSession(current => current ? { ...current, index: (current.index + 1) % current.skills.length, turn: current.turn + 1 } : null)} onClose={() => setPracticeSession(null)} onAnswerRecorded={reload} />}
  </div>;
}
