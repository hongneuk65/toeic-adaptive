import { Link } from 'react-router-dom';
import type { SkillMasteryItem } from '../../types/mastery';

const PART_NAMES = ['Mô tả tranh', 'Hỏi đáp', 'Hội thoại', 'Bài nói', 'Hoàn thành câu', 'Hoàn thành đoạn', 'Đọc hiểu'];
const PART_GROUPS = [
  { title: 'Nghe', parts: [1, 2, 3, 4] },
  { title: 'Đọc & ngữ pháp', parts: [5, 6, 7] },
];
const hasEstimate = (skill: SkillMasteryItem) => Number.isFinite(skill.masteryScore) && skill.masteryScore >= 0 && skill.masteryScore <= 1;
const practiced = (skill: SkillMasteryItem) => Number.isFinite(skill.practiceCount) && skill.practiceCount > 0;
const percent = (score: number) => Math.round(score * 100);

export function LearnerOverview({ skills, onPractice }: { skills: SkillMasteryItem[]; onPractice: (id: number) => void }) {
  const observed = skills.filter(practiced);
  const measured = observed.filter(hasEstimate);
  const focus = [...measured].filter(skill => skill.masteryScore < .7).sort((a, b) => a.masteryScore - b.masteryScore || a.skillId - b.skillId).slice(0, 3);
  return <section className="learner-overview" aria-labelledby="learner-overview-title">
    <div className="learner-overview-heading">
      <div>
        <h2 id="learner-overview-title">Bạn đang ở đâu?</h2>
        <p className="learner-coverage">Đã luyện <strong>{observed.length} / {skills.length}</strong> kỹ năng</p>
      </div>
      <Link className="study-action-button" to="/placement">Đánh giá đầu vào</Link>
    </div>
    <div className="learner-part-groups" aria-label="Biểu đồ ước lượng theo Part">
      {PART_GROUPS.map(group => <section key={group.title} className="learner-part-group" aria-label={group.title}>
        <h3>{group.title}</h3>
        <div className="learner-parts learner-part-chart">{group.parts.map(part => {
      const name = PART_NAMES[part - 1];
      const available = skills.filter(skill => skill.part === part);
      const observations = available.filter(practiced);
      const estimates = observations.filter(hasEstimate);
      const estimate = estimates.length ? estimates.reduce((sum, skill) => sum + skill.masteryScore, 0) / estimates.length : null;
      return <article className="learner-part" key={part} aria-label={`Part ${part}`}><h3>Part {part}</h3><p>{name}</p>{estimate === null ? <><strong className="learner-part-unknown">Chưa đủ dữ liệu</strong><svg className="learner-bar" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="12" className="learner-bar-missing" /></svg></> : <><strong>{percent(estimate)}<span>%</span></strong><svg className="learner-bar" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true"><rect width="100" height="12" className="learner-bar-track" /><rect width={percent(estimate)} height="12" className="learner-bar-value" /></svg><meter min={0} max={1} value={estimate} aria-label={`Ước lượng kỹ năng đã luyện Part ${part}`}>{percent(estimate)}%</meter></>}<small>{available.length === 0 ? 'Chưa có kỹ năng để luyện' : `${observations.length}/${available.length} kỹ năng đã luyện${estimate !== null && observations.length < available.length ? ' · một phần' : ''}`}</small></article>;
        })}</div>
      </section>)}
    </div>
    <p className="learner-overview-note">Ước lượng trên các kỹ năng đã luyện, không phải điểm TOEIC.</p>
    {focus.length > 0 && <details className="learner-focus">
      <summary>Có thể củng cố tiếp</summary>
      <ul>{focus.map(skill => <li key={skill.skillId}><div><strong>{skill.skillName}</strong><span>Part {skill.part} · Ước lượng {percent(skill.masteryScore)}% · {skill.practiceCount} lượt luyện</span></div><button className="study-action-button" onClick={() => onPractice(skill.skillId)} aria-label={`Củng cố ${skill.skillName}`}>Luyện kỹ năng</button></li>)}</ul>
    </details>}
  </section>;
}
