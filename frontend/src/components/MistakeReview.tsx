import { useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { useAsyncResource } from '../hooks/useAsyncResource';
import { LEARNING_PROGRESS_UPDATED } from '../lib/learning-progress';
import type { MistakeReviewPlan, MistakeReviewSkill } from '../types/mastery';

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * Chỉ hiện vài kỹ năng yếu kèm các câu hay sai nhất (tối đa 3 × 3).
 * Ẩn hoàn toàn khi không có câu cần ôn, để trang gợi ý không bị rối.
 */
export function MistakeReview({ onReview }: { onReview: (skill: MistakeReviewSkill) => void }) {
  const load = useCallback((signal: AbortSignal) => api<MistakeReviewPlan>('/das3h/mistake-review', { signal }), []);
  const { data, reload } = useAsyncResource(load);
  useEffect(() => {
    window.addEventListener(LEARNING_PROGRESS_UPDATED, reload);
    return () => window.removeEventListener(LEARNING_PROGRESS_UPDATED, reload);
  }, [reload]);
  const skills = Array.isArray(data?.skills) ? data.skills.filter(skill => Array.isArray(skill.questions) && skill.questions.length > 0) : [];
  if (!skills.length) return null;
  return <section className="mistake-review" aria-labelledby="mistake-review-title">
    <div className="topic-section-heading">
      <h2 id="mistake-review-title">Ôn câu hay sai</h2>
      <span className="topic-heading-note">Ưu tiên kỹ năng yếu, mỗi lần vài câu</span>
    </div>
    <div className="mistake-review-list">
      {skills.map(skill => {
        const expected = skill.questions.map(q => q.predictedProbability).filter((p): p is number => p !== null);
        const average = expected.length ? expected.reduce((a, b) => a + b, 0) / expected.length : null;
        const repeated = skill.questions.filter(q => q.wrongCount >= 2).length;
        return <article className="mistake-review-card" key={skill.skillId}>
          <p className="topic-parts">Part {skill.part}</p>
          <h3>{skill.skillName}</h3>
          <p className="mistake-review-reason">{skill.reason}</p>
          <ul className="mistake-review-facts">
            {repeated > 0 && <li>{repeated} câu đã sai từ 2 lần</li>}
            {average !== null && <li>Dự đoán làm đúng khoảng {percent(average)}</li>}
          </ul>
          <button className="primary-button" onClick={() => onReview(skill)} aria-label={`Ôn ${skill.questions.length} câu ${skill.skillName}`}>
            Ôn {skill.questions.length} câu
          </button>
        </article>;
      })}
    </div>
    {(data?.hiddenDueMistakes ?? 0) > 0 && <p className="topic-footnote">Còn {data?.hiddenDueMistakes} câu sai khác sẽ được gợi ý sau khi bạn ôn xong nhóm này.</p>}
  </section>;
}
