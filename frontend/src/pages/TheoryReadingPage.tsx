import { ActivitySuggestions } from '../components/ActivitySuggestions';
import '../styles/theory-library.css';
import { useCallback, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AiMarkdown } from '../components/rag/AiMarkdown';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { PageHeader } from '../components/ui/PageHeader';

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
  const [topicsExpanded, setTopicsExpanded] = useState(false);
  const loadCatalog = useCallback((signal: AbortSignal) => api<LessonSummary[]>('/theory/catalog', { signal }), []);
  const catalog = useAsyncResource(loadCatalog);
  const loadDetail = useCallback((signal: AbortSignal) => lessonId ? api<LessonDetail>(`/theory/${lessonId}`, { signal }) : Promise.resolve(null), [lessonId]);
  const detail = useAsyncResource(loadDetail);
  const lessons = catalog.data ?? [];
  const topics = [...new Map(lessons.map(lesson => [lesson.topic.id, lesson.topic])).values()];
  const topic = topics.find(item => item.id === topicId);
  const filtered = lessons.filter(lesson => (!topicId || lesson.topic.id === topicId)
    && (!part || lesson.part === part)
    && (!search.trim() || normalize(`${lesson.title} ${lesson.skill.name} ${lesson.topic.title}`).includes(normalize(search.trim()))));
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  function changeFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    next.delete('lesson'); setParams(next); setPage(1);
  }
  function openLesson(id: number) {
    const next = new URLSearchParams(params); next.set('lesson', String(id)); setParams(next);
  }
  const selectedSummary = lessons.find(item => item.id === lessonId);
  return <div className="page-stack theory-library">
    <PageHeader eyebrow="HIỂU KIẾN THỨC · LUYỆN ĐÚNG TRỌNG TÂM" title="Kiến thức TOEIC" description="Tìm bài theo chủ đề kiến thức, rồi lọc Part khi cần. Đọc từng bài và kiểm tra lại bằng quiz." />
    {!lessonId && <ActivitySuggestions section="theory" />}
    {lessonId ? <section className="theory-reader" aria-label="Nội dung bài học">
      <button className="theory-back" onClick={() => changeFilter('lesson', '')}>← Thư viện bài học</button>
      {detail.loading ? <p role="status" className="theory-state">Đang tải bài học…</p> : detail.error ? <div role="alert" className="theory-state">{detail.error} <button onClick={detail.reload}>Thử lại</button></div> : detail.data ? <article>
        <div className="theory-reader-meta"><span>Part {detail.data.part}</span>{selectedSummary && <span>{selectedSummary.topic.title}</span>}</div>
        <h2>{detail.data.title}</h2>
        <div className="theory-reader-body"><AiMarkdown content={detail.data.content} /></div>
        <footer><div><strong>Kiểm tra điều vừa học</strong><p>Thử trả lời trước khi xem lời giải.</p></div><button className="primary-button" onClick={() => navigate(`/theory/${lessonId}/quiz`)}>Làm quiz củng cố →</button></footer>
      </article> : <p className="theory-state">Không tìm thấy bài học.</p>}
    </section> : <>
      {catalog.loading ? <p role="status" className="theory-state">Đang tải thư viện bài học…</p> : catalog.error ? <div role="alert" className="theory-state">{catalog.error} <button onClick={catalog.reload}>Thử lại</button></div> : <>
        <section className="theory-topics" aria-labelledby="theory-topics-title">
          <div className="theory-section-heading"><div><h2 id="theory-topics-title">Bạn muốn củng cố điều gì?</h2><p>Các bài liên quan được gom thành chủ đề, không chia thành từng tag nhỏ.</p></div><button className="theory-all" aria-pressed={!topicId} onClick={() => changeFilter('topic', '')}>Tất cả chủ đề</button></div>
          <div className="theory-topic-grid">{(topicsExpanded ? topics : topics.filter((item, index) => index < 6 || item.id === topicId)).map(item => <button key={item.id} className="theory-topic" aria-pressed={topicId === item.id} onClick={() => changeFilter('topic', topicId === item.id ? '' : item.id)}>
            <span className="theory-topic-count">{lessons.filter(lesson => lesson.topic.id === item.id).length} bài học</span><strong>{item.title}</strong><span>{item.description}</span>
          </button>)}</div>
          {topics.length > 6 && <button className="theory-all mt-4" aria-expanded={topicsExpanded} onClick={() => setTopicsExpanded(value => !value)}>{topicsExpanded ? 'Thu gọn chủ đề' : `Xem tất cả ${topics.length} chủ đề`}</button>}
        </section>
        <section className="theory-catalog" aria-labelledby="theory-catalog-title">
          <div className="theory-section-heading"><div><h2 id="theory-catalog-title">{topic?.title || 'Tất cả bài học'}</h2><p>{filtered.length} bài học{part ? ` · Part ${part}` : ' · Toàn bộ Part'}</p></div></div>
          <div className="theory-filters"><label className="theory-search"><span>Tìm bài học</span><input type="search" value={search} placeholder="Ví dụ: câu hỏi, động từ, email…" onChange={event => { setSearch(event.target.value); setPage(1); }} /></label><label><span>Phần thi liên quan</span><select value={part} onChange={event => changeFilter('part', event.target.value === '0' ? '' : event.target.value)}><option value={0}>Tất cả Part</option>{[1, 2, 3, 4, 5, 6, 7].map(value => <option key={value} value={value}>Part {value}</option>)}</select></label></div>
          {!filtered.length ? <div className="theory-state"><h3>Chưa có bài phù hợp</h3><p>Thử từ khóa khác hoặc bỏ bộ lọc để xem thêm bài học.</p><button onClick={() => { setSearch(''); setParams({}); setPage(1); }}>Bỏ bộ lọc</button></div> : <>
            <div className="theory-lessons">{visible.map(lesson => <button className="theory-lesson" key={lesson.id} onClick={() => openLesson(lesson.id)}><span className="theory-part">P{lesson.part}</span><span className="theory-lesson-copy"><strong>{lesson.title}</strong><span>{lesson.topic.title}</span></span><span className="theory-open">Đọc bài <span aria-hidden="true">↗</span></span></button>)}</div>
            {pages > 1 && <nav className="theory-pagination" aria-label="Trang bài học"><button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>← Trước</button><span aria-live="polite">Trang {currentPage} / {pages}</span><button disabled={currentPage === pages} onClick={() => setPage(currentPage + 1)}>Sau →</button></nav>}
          </>}
        </section>
      </>}
    </>}
    {lessonId > 0 && detail.data && <ActivitySuggestions section="theory" compact excludeHref={`/theory?lesson=${lessonId}`} />}
  </div>;
}
