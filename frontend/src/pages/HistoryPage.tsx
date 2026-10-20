import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { PageHeader } from '../components/ui/PageHeader';
import { StudyIcon } from '../components/StudyIcon';
import { useAsyncResource } from '../hooks/useAsyncResource';
import '../styles/history.css';

interface Entry { id: number; title: string; startedAt: string; submittedAt: string | null; result: string | null; questionCount?: number; href: string }
interface History { items: Entry[]; total: number; pageSize: number }
const statuses = [['ALL', 'Tất cả'], ['IN_PROGRESS', 'Đang làm'], ['COMPLETED', 'Đã nộp bài']] as const;
export function HistoryPage() {
 const [type, setType] = useState('EXAM');
 const [status, setStatus] = useState('ALL');
 const [page, setPage] = useState(1);
 const resource = useAsyncResource(useCallback((signal: AbortSignal) => api<History>(`/history?type=${type}&status=${status}&page=${page}`, { signal }), [type, status, page]));
 const { data, loading, error } = resource;
 return <div className="history-page page-stack">
  <PageHeader variant="compact" eyebrow="KIỂM TRA & NHÌN LẠI" title="Lịch sử làm bài" description="Các bài bạn đã làm đều ở đây. Tiếp tục bài còn dở hoặc xem lại lời giải để hiểu sâu hơn." actions={<Link to="/exam" className="primary-button">Làm bài mới <span aria-hidden="true">＋</span></Link>} />
  <div className="history-workspace"><section className="history-main" aria-label="Lịch sử làm bài">
   <div className="history-type-tabs" aria-label="Loại bài">{[['EXAM', 'Thi thử TOEIC', 'exam'], ['READING', 'Reading', 'book']].map(([value, label, icon]) => <button key={value} aria-pressed={type === value} onClick={() => { setType(value); setPage(1); }}><StudyIcon name={icon} />{label}</button>)}</div>
   <div className="history-toolbar"><div className="history-status-tabs" aria-label="Lọc theo trạng thái">{statuses.map(([value, label]) => <button key={value} aria-pressed={status === value} onClick={() => { setStatus(value); setPage(1); }}>{value !== 'ALL' && <span className={`history-filter-dot ${value === 'COMPLETED' ? 'done' : ''}`} />}{label}</button>)}</div><span className="history-sort">Mới nhất trước ↓</span></div>
   <div className="history-list-heading"><h2>{loading ? 'Đang tải lịch sử…' : `${data?.total ?? 0} bài trong danh sách`}</h2><span>KẾT QUẢ & CHỮA BÀI</span></div>
   {error ? <div className="history-empty" role="alert"><StudyIcon name="clock" /><h3>Chưa tải được lịch sử</h3><p>{error}</p><button className="secondary-button" onClick={resource.reload}>Thử lại</button></div> : loading || !data ? <div className="history-loading" role="status"><span className="sr-only">Đang tải lịch sử làm bài</span>{[0, 1, 2].map(index => <div className="history-skeleton" key={index} aria-hidden="true"><span /><div><i /><i /></div></div>)}</div> : <>
   {data.items.length === 0 ? <div className="history-empty"><span className="history-empty-icon"><StudyIcon name="book" /></span><h3>{status === 'IN_PROGRESS' ? 'Bạn không còn bài đang làm dở' : status === 'COMPLETED' ? 'Chưa có bài đã nộp' : 'Bắt đầu từ bài luyện đầu tiên'}</h3><p>{status === 'IN_PROGRESS' ? 'Chọn một bài mới khi bạn sẵn sàng.' : 'Sau khi làm bài, bạn có thể quay lại đây để đọc lời giải và ôn những câu chưa chắc.'}</p><Link className="primary-button" to={type === 'EXAM' ? '/exam' : '/reading'}>Chọn bài luyện <span aria-hidden="true">→</span></Link></div> : <div className="history-list">{data.items.map(item => {
    const date = new Date(item.startedAt);
    return <article key={item.id} className="history-card"><div className="history-date" aria-hidden="true"><strong>{date.getDate().toString().padStart(2, '0')}</strong><span>THÁNG {date.getMonth() + 1}</span></div><div className="history-card-content"><div className="history-card-meta"><span className={`history-badge ${item.submittedAt ? 'done' : ''}`}><span />{item.submittedAt ? 'Đã nộp bài' : 'Đang làm'}</span><span>#{item.id}</span></div><h3>{item.title}</h3><p><time dateTime={item.startedAt}>{date.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</time>{item.questionCount ? ` · ${item.questionCount} câu hỏi` : ''}</p></div><div className="history-card-action"><div className="history-result"><span>{item.submittedAt ? 'Kết quả' : 'Bài chưa nộp'}</span><strong>{item.result || 'Tiếp tục luyện'}</strong></div><Link aria-label={`${item.submittedAt ? 'Xem chữa bài' : 'Tiếp tục'}: ${item.title}, bài ${item.id}`} className={item.submittedAt ? 'secondary-button' : 'primary-button'} to={item.href}>{item.submittedAt ? 'Chữa bài' : 'Làm tiếp'}<span aria-hidden="true">↗</span></Link></div></article>;
   })}</div>}
   {data.total > data.pageSize && <nav className="history-pagination" aria-label="Trang lịch sử"><button className="secondary-button" disabled={page === 1} onClick={() => setPage(value => value - 1)}>← Trước</button><span>Trang {page} / {Math.max(1, Math.ceil(data.total / data.pageSize))}</span><button className="secondary-button" disabled={page * data.pageSize >= data.total} onClick={() => setPage(value => value + 1)}>Sau →</button></nav>}
   </>}
  </section></div>
 </div>;
}
