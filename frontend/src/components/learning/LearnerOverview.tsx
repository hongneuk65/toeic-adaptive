import { Link } from 'react-router-dom';
import type { SkillMasteryItem } from '../../types/mastery';

const PART_NAMES = ['Mô tả tranh', 'Hỏi đáp', 'Hội thoại', 'Bài nói', 'Hoàn thành câu', 'Hoàn thành đoạn', 'Đọc hiểu'];
const hasEstimate = (skill: SkillMasteryItem) => Number.isFinite(skill.masteryScore) && skill.masteryScore >= 0 && skill.masteryScore <= 1;
const practiced = (skill: SkillMasteryItem) => Number.isFinite(skill.practiceCount) && skill.practiceCount > 0;
const percent = (score: number) => Math.round(score * 100);

export function LearnerOverview({ skills, onPractice }: { skills: SkillMasteryItem[]; onPractice: (id: number) => void }) {
  const observed = skills.filter(practiced);
  const measured = observed.filter(hasEstimate);
  const practiceCount = observed.reduce((sum, skill) => sum + skill.practiceCount, 0);
  const dates = observed.map(skill => skill.lastPracticed ? Date.parse(skill.lastPracticed) : NaN).filter(Number.isFinite);
  const lastPracticed = dates.length ? new Date(Math.max(...dates)) : null;
  const focus = [...measured].filter(skill => skill.masteryScore < .7).sort((a, b) => a.masteryScore - b.masteryScore || a.skillId - b.skillId).slice(0, 3);
  return <section className="learner-overview" aria-labelledby="learner-overview-title">
    <div className="learner-overview-heading"><div><h2 id="learner-overview-title">Bạn đang ở đâu?</h2>{!observed.length && <p>Chưa đủ dữ liệu đánh giá.</p>}</div><Link className="study-action-button" to="/placement">Đánh giá đầu vào</Link></div>
    <dl className="learner-overview-stats">
      <div><dt>Kỹ năng đã luyện</dt><dd>{observed.length}<span> / {skills.length}</span></dd></div>
      <div><dt>Lượt luyện kỹ năng</dt><dd>{practiceCount}</dd></div>
      <div><dt>Lần luyện gần nhất</dt><dd className="learner-overview-date">{lastPracticed ? <time dateTime={lastPracticed.toISOString()}>{new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Asia/Ho_Chi_Minh' }).format(lastPracticed)}</time> : 'Chưa ghi nhận'}</dd></div>
    </dl>
    <div className="learner-parts" aria-label="Mức kỹ năng theo Part">{PART_NAMES.map((name, index) => {
      const part = index + 1;
      const available = skills.filter(skill => skill.part === part);
      const observations = available.filter(practiced);
      const estimates = observations.filter(hasEstimate);
      const estimate = estimates.length ? estimates.reduce((sum, skill) => sum + skill.masteryScore, 0) / estimates.length : null;
      return <article className="learner-part" key={part} aria-label={`Part ${part}`}><h3>Part {part}</h3><p>{name}</p>{estimate === null ? <strong className="learner-part-unknown">Chưa đủ dữ liệu</strong> : <><strong>{percent(estimate)}<span>%</span></strong><meter min={0} max={1} value={estimate} aria-label={`Ước lượng kỹ năng đã luyện Part ${part}`}>{percent(estimate)}%</meter></>}<small>{observations.length}/{available.length} kỹ năng đã luyện{estimate !== null && observations.length < available.length ? ' · một phần' : ''}</small></article>;
    })}</div>
    {focus.length > 0 && <div className="learner-focus"><h3>Có thể củng cố tiếp</h3><ul>{focus.map(skill => <li key={skill.skillId}><div><strong>{skill.skillName}</strong><span>Part {skill.part} · Ước lượng {percent(skill.masteryScore)}% · {skill.practiceCount} lượt luyện</span></div><button className="study-action-button" onClick={() => onPractice(skill.skillId)} aria-label={`Củng cố ${skill.skillName}`}>Luyện kỹ năng</button></li>)}</ul></div>}
    <p className="learner-overview-note">Ước lượng kỹ năng, không phải điểm TOEIC.</p>
    <details className="mt-2 text-sm leading-6 text-ink-medium"><summary className="cursor-pointer rounded py-2 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">Cách đọc kết quả</summary><p>Tỷ lệ chỉ tổng hợp các kỹ năng đã luyện, không phải tỷ lệ đúng toàn bài. Mỗi kỹ năng được tính ngang nhau; một câu có thể góp dữ liệu cho nhiều kỹ năng. Chưa luyện không có nghĩa là yếu; dữ liệu ít cần kiểm tra thêm.</p></details>
  </section>;
}
