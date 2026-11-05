import { Link } from 'react-router-dom';

const programs = [
  { title: 'Reading', subtitle: 'Đọc hiểu · Mệnh đề chính', path: '/reading', color: 'sky', number: '01' },
  { title: 'Listening', subtitle: 'Chép chính tả · Nói theo', path: '/listening', color: 'blue', number: '02' },
  { title: 'Kiến thức', subtitle: 'Chủ đề · Từng Part', path: '/theory', color: 'green', number: '03' },
  { title: 'Từ vựng', subtitle: 'Viết · Nghe · Luyện nói', path: '/flashcards', color: 'orange', number: '04' },
  { title: 'Thi thử', subtitle: 'Từng Part · Bài thi đầy đủ', path: '/exam', color: 'violet', number: '05' },
];

export function HomePrograms() {
  return <section id="programs" className="prep-home-programs" aria-labelledby="prep-programs-title">
    <div className="prep-home-heading"><h2 id="prep-programs-title">Chọn cách học hôm nay</h2><Link className="study-action-button" to="/curriculum">Học theo lộ trình</Link></div>
    <div className="home-studio-paths" role="region" aria-label="Nội dung luyện TOEIC">
      {programs.map(program => <article key={program.path} className={`home-studio-path home-studio-path-${program.color}`}><Link to={program.path} aria-label={`Bắt đầu ${program.title}`}><span className="home-studio-path-number" aria-hidden="true">{program.number}</span><div><h3>{program.title}</h3><p>{program.subtitle}</p></div><span className="home-studio-path-action">Bắt đầu</span></Link></article>)}
    </div>
  </section>;
}
