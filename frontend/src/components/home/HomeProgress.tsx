import { Link } from 'react-router-dom';

interface HomeProgressProps {
  loading: boolean;
  refreshing: boolean;
  error: boolean;
  onRetry: () => void;
  resumes: { key: string; path: string; title: string; detail: string }[];
  nextSkill?: string;
  hasLearningActivity?: boolean;
  stats: { label: string; value: number }[];
}

export function HomeProgress({ loading, refreshing, error, onRetry, resumes, nextSkill, stats, hasLearningActivity }: HomeProgressProps) {
  const hasRecordedProgress = Boolean(hasLearningActivity || nextSkill) || stats.some(stat => stat.value > 0);
  const visibleResumes = resumes.slice(0, 2);
  const moreResumes = resumes.slice(2);
  return <section id="learning-progress" className="prep-home-progress home-studio-panel" aria-labelledby="prep-progress-title" aria-busy={refreshing}>
    <div className="prep-home-heading"><h2 id="prep-progress-title">Hôm nay, mình học gì?</h2>{refreshing && !loading && <span role="status" className="home-studio-updating">Đang cập nhật…</span>}</div>
    {error && <div className="prep-home-status" role="alert">Chưa tải đủ tiến độ. <button type="button" disabled={refreshing} onClick={onRetry}>{refreshing ? 'Đang tải…' : 'Thử lại'}</button></div>}
    {loading ? <p className="prep-home-status" role="status">Đang tải tiến độ học…</p> : <>
      <div className="prep-home-progress-content">
        <div className="home-studio-current">
          {resumes.length ? <>
            <h3>Tiếp tục bài đang học</h3>
            <ul className="prep-home-resume-list">{visibleResumes.map(resume => <li key={resume.key}><div><p>{resume.detail}</p><h4>{resume.title}</h4></div><Link to={resume.path} aria-label={`Tiếp tục ${resume.title}`}>Học tiếp</Link></li>)}</ul>
            {moreResumes.length > 0 && <details className="home-studio-more"><summary>{moreResumes.length} bài đã lưu khác</summary><ul className="prep-home-resume-list">{moreResumes.map(resume => <li key={resume.key}><div><p>{resume.detail}</p><h4>{resume.title}</h4></div><Link to={resume.path} aria-label={`Tiếp tục ${resume.title}`}>Học tiếp</Link></li>)}</ul></details>}
          </> : <div className="home-studio-first-step"><div><h3>{hasRecordedProgress ? 'Chọn bài học mới' : 'Bài luyện đầu tiên'}</h3><p>{hasRecordedProgress ? 'Chưa có bài đang học dở.' : 'Bắt đầu với một bài đọc ngắn.'}</p></div><Link className="prep-home-blue-button" to="/reading">Chọn bài đọc</Link></div>}
        </div>
        {nextSkill && <aside className="home-studio-focus"><div><span>Trọng tâm tiếp theo</span><p>{nextSkill}</p></div><Link to="/recommendations">Xem gợi ý</Link></aside>}
      </div>
      {stats.length > 0 && <dl className="prep-home-real-stats" aria-label="Tiến độ đã ghi nhận">{stats.map(stat => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}</dl>}
    </>}
  </section>;
}
