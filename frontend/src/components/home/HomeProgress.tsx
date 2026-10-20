import { Link } from 'react-router-dom';

interface HomeProgressProps {
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  onRetry: () => void;
  resumes: { key: string; path: string; title: string; detail: string }[];
  nextSkill?: string;
  stats: { label: string; value: number }[];
}

export function HomeProgress({ loading, refreshing, error, onRetry, resumes, nextSkill, stats }: HomeProgressProps) {
  return <section id="learning-progress" className="prep-home-progress" aria-labelledby="prep-progress-title" aria-busy={refreshing}><div className="prep-home-heading"><p className="home-section-eyebrow">KHÔNG GIAN HỌC CỦA BẠN</p><h2 id="prep-progress-title">Hôm nay, mình học gì?</h2><p>Tiếp tục bài đã lưu hoặc chọn một kỹ năng để tiến bộ.</p></div>
    {error && <div className="prep-home-status" role="alert">Chưa tải được một phần tiến độ. <button type="button" disabled={refreshing} onClick={onRetry}>{refreshing ? 'Đang tải…' : 'Thử lại'}</button></div>}
    {refreshing && !loading && <p className="prep-home-status" role="status">Đang cập nhật tiến độ…</p>}
    {loading ? <p className="prep-home-status" role="status">Đang tải tiến độ học…</p> : <div className="prep-home-progress-content"><div><h3>{resumes.length ? 'Tiếp tục bài đang học' : 'Sẵn sàng cho bài luyện đầu tiên?'}</h3>{resumes.length ? <ul className="prep-home-resume-list">{resumes.map(resume => <li key={resume.key}><div><p>{resume.detail}</p><h4>{resume.title}</h4></div><Link to={resume.path} aria-label={`Tiếp tục ${resume.title}`}>Tiếp tục</Link></li>)}</ul> : <><p>Chọn bài từ thư viện để bắt đầu. Bài đã lưu sẽ xuất hiện tại đây.</p><Link className="prep-home-blue-button" to="/reading">Chọn bài đọc</Link></>}</div><aside><h3>Trọng tâm tiếp theo</h3><p>{nextSkill ? `Ôn lại ${nextSkill} từ lịch sử luyện của bạn.` : 'Sau khi luyện tập, xem gợi ý kỹ năng cần ôn để chọn buổi học tiếp theo.'}</p><Link to="/recommendations">Xem gợi ý học tiếp</Link></aside></div>}
    {!loading && stats.length > 0 && <dl className="prep-home-real-stats" aria-label="Tiến độ đã ghi nhận">{stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl>}
  </section>;
}
