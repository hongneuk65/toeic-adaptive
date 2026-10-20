import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const programs = [
  { title: 'Reading', subtitle: 'Đọc hiểu, hiểu sâu.', description: 'Luyện tìm thông tin, đọc bài và trả lời câu hỏi theo từng phần TOEIC.', path: '/reading', color: 'sky' },
  { title: 'Listening', subtitle: 'Nghe rõ, tự tin hơn.', description: 'Luyện nghe theo từng đoạn, chép chính tả và kiểm tra câu trả lời.', path: '/listening', color: 'blue' },
  { title: 'Lý thuyết', subtitle: 'Nắm chắc nền tảng.', description: 'Ôn kiến thức theo Part và kiểm tra mức độ hiểu qua bài quiz.', path: '/theory', color: 'green' },
  { title: 'Từ vựng', subtitle: 'Ghi nhớ từng ngày.', description: 'Học và ôn từ vựng trong những bộ flashcard của bạn.', path: '/flashcards', color: 'orange' },
  { title: 'Thi thử', subtitle: 'Sẵn sàng cho kỳ thi.', description: 'Làm đề có thời gian, xem kết quả và học từ những câu trả lời.', path: '/exam', color: 'violet' },
];

export function HomePrograms() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [bounds, setBounds] = useState({ start: true, end: false });
  const updateBounds = () => {
    const track = trackRef.current;
    if (track) {
      const start = track.scrollLeft < 2;
      const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      setBounds(previous => previous.start === start && previous.end === end ? previous : { start, end });
    }
  };
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollLeft = 0;
    const observer = new ResizeObserver(() => {
      const start = track.scrollLeft < 2;
      const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      setBounds(previous => previous.start === start && previous.end === end ? previous : { start, end });
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);
  const move = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.firstElementChild?.getBoundingClientRect().width || 320;
    const gap = Number.parseFloat(window.getComputedStyle(track).columnGap) || 0;
    track.scrollBy({ left: direction * (width + gap), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <section id="programs" className="prep-home-programs" aria-labelledby="prep-programs-title">
    <div className="prep-home-heading"><h2 id="prep-programs-title">Một mục tiêu.<br />Nhiều cách tiến bộ.</h2><p>Chọn nội dung bạn muốn tập trung trong buổi học hôm nay.</p></div>
    <div className="prep-home-carousel-controls"><button type="button" disabled={bounds.start} onClick={() => move(-1)} aria-label="Chương trình trước">Trước</button><button type="button" disabled={bounds.end} onClick={() => move(1)} aria-label="Chương trình tiếp theo">Tiếp</button></div>
    <div ref={trackRef} onScroll={updateBounds} className="prep-home-program-track" role="region" aria-label="Nội dung luyện TOEIC" tabIndex={0}>
      {programs.map(program => <article key={program.path} className={`prep-home-program-card prep-home-program-${program.color}`}><div><h3>{program.title}</h3><p className="prep-home-program-subtitle">{program.subtitle}</p><p>{program.description}</p></div><Link to={program.path} aria-label={`Bắt đầu ${program.title}`}>Bắt đầu</Link></article>)}
    </div>
  </section>;
}
