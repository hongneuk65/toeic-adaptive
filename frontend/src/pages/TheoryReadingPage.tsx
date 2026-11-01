import { ActivitySuggestions } from '../components/ActivitySuggestions';
import '../styles/theory-library.css';
import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AiMarkdown } from '../components/rag/AiMarkdown';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';

type Topic = { id: string; title: string; description: string };
interface LessonSummary {
  id: number; title: string; part: number; topic: Topic;
  skill: { code: string; name: string; category?: string };
}
interface LessonDetail {
  id: number; title: string; content: string; part: number;
  skill: { name: string; code: string };
}
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const PAGE_SIZE = 12;

export function TheoryReadingPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const topicId = params.get('topic') || '';
  const part = Number(params.get('part')) || 0;
  const lessonId = Number(params.get('lesson')) || 0;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const browseBy = params.get('view') === 'part' ? 'part' : 'topic';
  const loadCatalog = useCallback((signal: AbortSignal) => api<LessonSummary[]>('/theory/catalog', { signal }), []);
  const catalog = useAsyncResource(loadCatalog);
  const loadDetail = useCallback((signal: AbortSignal) => lessonId ? api<LessonDetail>(`/theory/${lessonId}`, { signal }) : Promise.resolve(null), [lessonId]);
  const detail = useAsyncResource(loadDetail);
  const lessons = catalog.data ?? [];
  const topics = [...new Map(lessons.map(lesson => [lesson.topic.id, lesson.topic])).values()].sort((a, b) => a.title.localeCompare(b.title, 'vi'));
  const topicOrder = new Map(topics.map((item, index) => [item.id, index]));
  const topic = topics.find(item => item.id === topicId);
  const filtered = lessons.filter(lesson => (!topicId || lesson.topic.id === topicId)
    && (!part || lesson.part === part)
    && (!search.trim() || normalize(`${lesson.title} ${lesson.skill.name} ${lesson.topic.title}`).includes(normalize(search.trim()))))
    .sort((a, b) => browseBy === 'part' ? a.part - b.part || a.id - b.id : (topicOrder.get(a.topic.id) ?? 0) - (topicOrder.get(b.topic.id) ?? 0) || a.part - b.part || a.id - b.id);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  function changeFilter(key: string, value: string) {
    // BrowserRouter writes the URL before its deferred render commits. Read the
    // latest URL so rapid filter changes do not restore an earlier selection.
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('lesson'); setParams(next); setPage(1);
  }
  function openLesson(id: number) {
    const next = new URLSearchParams(window.location.search); next.set('lesson', String(id)); setParams(next);
  }
  const selectedSummary = lessons.find(item => item.id === lessonId);
  return <div className="page-stack theory-library">
    <PageHeader variant="compact" title="Kiến thức TOEIC" description="Tìm bài theo chủ đề hoặc Part, rồi luyện quiz để củng cố." />
    {!lessonId && <ActivitySuggestions section="theory" compact />}
    {lessonId ? <section className="theory-reader" aria-label="Nội dung bài học">
      <button className="theory-back secondary-button" onClick={() => changeFilter('lesson', '')}>← Thư viện bài học</button>
      {detail.loading ? <p role="status" className="theory-state">Đang tải bài học…</p> : detail.error ? <div role="alert" className="theory-state">{detail.error} <button onClick={detail.reload}>Thử lại</button></div> : detail.data ? <article>
        <div className="theory-reader-meta"><span>Part {detail.data.part}</span>{selectedSummary && <span>{selectedSummary.topic.title}</span>}</div>
        <h2>{detail.data.title}</h2>
        <div className="theory-reader-body"><AiMarkdown content={detail.data.content} /></div>
        <footer><div><strong>Kiểm tra điều vừa học</strong><p>Thử trả lời trước khi xem lời giải.</p></div><button className="primary-button" onClick={() => navigate(`/theory/${lessonId}/quiz`)}>Làm quiz củng cố →</button></footer>
      </article> : <p className="theory-state">Không tìm thấy bài học.</p>}
    </section> : <>
      {catalog.loading ? <p role="status" className="theory-state">Đang tải thư viện bài học…</p> : catalog.error ? <div role="alert" className="theory-state">{catalog.error} <button onClick={catalog.reload}>Thử lại</button></div> : <>
        <section className="theory-catalog" aria-labelledby="theory-catalog-title">
          <div className="theory-section-heading">
            <div><h2 id="theory-catalog-title">Thư viện kiến thức</h2><p>Tìm nhanh bài phù hợp, mỗi trang tối đa {PAGE_SIZE} bài.</p></div>
            <div className="theory-browse-switch" role="group" aria-label="Cách sắp xếp bài học">
              <button aria-pressed={browseBy === 'topic'} onClick={() => changeFilter('view', '')}>Theo chủ đề</button>
              <button aria-pressed={browseBy === 'part'} onClick={() => changeFilter('view', 'part')}>Theo Part</button>
            </div>
          </div>
          <div className={`theory-filters theory-filters-${browseBy}`}>
            <label className="theory-search"><span>Tìm bài học</span><input type="search" value={search} placeholder="Từ khóa, tên bài hoặc kỹ năng…" onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
            <label className="theory-topic-filter"><span>Chủ đề kiến thức</span><select value={topicId} onChange={event => changeFilter('topic', event.target.value)}><option value="">Tất cả chủ đề</option>{topics.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
            <label className="theory-part-filter"><span>Phần thi liên quan</span><select value={part} onChange={event => changeFilter('part', event.target.value === '0' ? '' : event.target.value)}><option value={0}>Tất cả Part</option>{[1, 2, 3, 4, 5, 6, 7].map(value => <option key={value} value={value}>Part {value}</option>)}</select></label>
          </div>
          <div className="theory-results-heading"><p role="status">{filtered.length} bài học{topic ? ` · ${topic.title}` : ''}{part ? ` · Part ${part}` : ''}</p>{(topicId || part || search) && <button className="study-action-button" onClick={() => { setSearch(''); const next = new URLSearchParams(window.location.search); next.delete('topic'); next.delete('part'); next.delete('lesson'); setParams(next); setPage(1); }}>Bỏ bộ lọc</button>}</div>
          {!filtered.length ? <div className="theory-state"><h3>Chưa có bài phù hợp</h3><p>Thử từ khóa khác hoặc dùng nút Bỏ bộ lọc ở trên.</p></div> : <>
            <div className="theory-lessons">{visible.map(lesson => <button className="theory-lesson" key={lesson.id} onClick={() => openLesson(lesson.id)}><span className="theory-part">P{lesson.part}</span><span className="theory-lesson-copy"><strong>{lesson.title}</strong><span>{lesson.topic.title}</span></span><span className="theory-open">Đọc bài <span aria-hidden="true">↗</span></span></button>)}</div>
            <Pagination page={currentPage} totalPages={pages} onPageChange={setPage} label="Trang bài học" />
          </>}
        </section>
      </>}
    </>}
    {lessonId > 0 && detail.data && <ActivitySuggestions section="theory" compact excludeHref={`/theory?lesson=${lessonId}`} />}
  </div>;
}
