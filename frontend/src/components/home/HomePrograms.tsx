import { StudyIcon } from '../StudyIcon';
import { Link } from 'react-router-dom';

const programs = [
  { title: 'Reading', subtitle: 'Đọc hiểu · Mệnh đề chính', path: '/reading', color: 'sky', number: '01' },
  { title: 'Listening', subtitle: 'Chép chính tả · Nói theo', path: '/listening', color: 'blue', number: '02' },
  { title: 'Kiến thức', subtitle: 'Chủ đề · Từng Part', path: '/theory', color: 'green', number: '03' },
  { title: 'Từ vựng', subtitle: 'Viết · Nghe · Luyện nói', path: '/flashcards', color: 'orange', number: '04' },
  { title: 'Thi thử', subtitle: 'Từng Part · Bài thi đầy đủ', path: '/exam', color: 'violet', number: '05' },
];

const icon = (path: string) => path === '/listening' ? 'headphones' : path === '/exam' ? 'exam' : path === '/flashcards' ? 'cards' : path === '/theory' ? 'layers' : 'book';
const details: Record<string, string[]> = {
  '/reading': ['Đọc hiểu Part 5–7 theo từng mệnh đề chính.', 'Tra nghĩa ngay trên đoạn văn, lưu vào bộ từ vựng.'],
  '/listening': ['Chép chính tả từng câu, nghe lại đoạn khó.', 'Nói theo (shadowing) để quen tốc độ và ngữ điệu.'],
  '/theory': ['Chủ điểm ngữ pháp và mẹo làm bài cho từng Part.', 'Kiểm tra nhanh sau mỗi bài để chốt kiến thức.'],
  '/flashcards': ['Ôn lặp lại ngắt quãng theo trí nhớ của bạn.', 'Luyện viết, nghe và nói với từng thẻ.'],
  '/exam': ['Thi thử từng Part hoặc trọn bài 200 câu.', 'Xem lại đáp án, lời giải và thời gian từng câu.'],
};

export function HomePrograms() {
  return <section id="programs" className="forum-band" aria-labelledby="prep-programs-title">
    <div className="forum-band-inner">
      <div className="forum-band-heading"><h2 id="prep-programs-title">Nội dung luyện tập</h2><Link className="secondary-button forum-band-link" to="/curriculum">Học theo lộ trình <span aria-hidden="true">→</span></Link></div>
      <div className="forum-program-sheet" role="region" aria-label="Nội dung luyện TOEIC">{programs.map(program => <article key={program.path} className="forum-program">
        <span className="forum-program-icon"><StudyIcon name={icon(program.path)} /></span>
        <div><h3>{program.path === '/reading' || program.path === '/listening' ? `Kỹ năng ${program.title}` : program.title}</h3><p className="forum-program-sub">{program.subtitle}</p><ul>{details[program.path].map(line => <li key={line}>{line}</li>)}</ul></div>
        <Link to={program.path} className="forum-program-action" aria-label={`Bắt đầu ${program.title}`}>Bắt đầu <span aria-hidden="true">→</span></Link>
      </article>)}</div>
    </div>
  </section>;
}
