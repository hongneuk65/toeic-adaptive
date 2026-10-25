import { topicForLesson, topicForSkill } from './learning-topics';

export interface LearningPlanSkill {
  skillId: number;
  skillCode: string;
  skillName: string;
  part: number;
  masteryScore: number;
  practiceCount: number;
  lastPracticed: Date | string | null;
}

export interface LearningPlanLesson {
  id: number;
  title: string;
  part: number;
  skillId: number;
}

type Priority = 'diagnostic' | 'focus' | 'review' | 'maintain';
type Foundation = { skillId: number; skillName: string; status: 'unassessed' | 'needs-practice' };

// Curriculum hypotheses, not validated hard prerequisites. Edges only reduce
// priority; they never prevent a learner from opening an exercise.
const FOUNDATIONS: Readonly<Record<string, readonly string[]>> = {
  P5_SUBJECT_VERB_AGREE: ['P5_PARTS_OF_SPEECH'],
  P5_RELATIVE_CLAUSES: ['P5_SUBJECT_VERB_AGREE'],
  P5_SUBJUNCTIVE_MODAL: ['P5_VERB_TENSES_VOICE'],
  P6_GRAMMAR_IN_CONTEXT: ['P5_PARTS_OF_SPEECH', 'P5_VERB_TENSES_VOICE'],
  P6_TRANSITION_WORDS: ['P5_CONNECTORS_CONJ'],
  P7A_INFERENCE_DETAIL: ['P7A_FACT_NEGATIVE_FACT'],
  P7B_CROSS_INFO_SYNTHESIS: ['P7A_FACT_NEGATIVE_FACT'],
  P7B_MULTI_INFERENCE: ['P7A_INFERENCE_DETAIL', 'P7B_CROSS_INFO_SYNTHESIS'],
};

const DAY_MS = 86_400_000;
const probability = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : .5;

/**
 * A deterministic, inspectable scheduling policy over existing KT predictions.
 * Review intervals (1/3/7 days) and ranking weights are product heuristics, not
 * SM-2, a fitted forgetting model, or evidence of improved learning outcomes.
 * The KT probability is never decayed a second time by this policy.
 * Callers supply only skills with an available exercise bank.
 */
export function buildLearningPlan(
  skills: readonly LearningPlanSkill[],
  lessons: readonly LearningPlanLesson[],
  now = new Date(),
) {
  if (!Number.isFinite(now.getTime())) throw new RangeError('Invalid learning plan time');
  const byCode = new Map(skills.map(skill => [skill.skillCode, skill]));
  const items = skills.map(skill => {
    const observed = skill.practiceCount > 0;
    const predicted = probability(skill.masteryScore);
    const rawLast = skill.lastPracticed === null ? NaN : new Date(skill.lastPracticed).getTime();
    // Future timestamps must not postpone review indefinitely due to clock skew.
    const last = Number.isFinite(rawLast) ? Math.min(rawLast, now.getTime()) : null;
    const intervalDays = predicted < .65 ? 1 : predicted < .85 ? 3 : 7;
    const due = observed && last !== null ? last + intervalDays * DAY_MS : null;
    const isDue = due !== null && due <= now.getTime();
    const foundations: Foundation[] = (FOUNDATIONS[skill.skillCode] ?? []).flatMap<Foundation>(code => {
      const foundation = byCode.get(code);
      if (!foundation) return [];
      if (foundation.practiceCount === 0) return [{ skillId: foundation.skillId, skillName: foundation.skillName, status: 'unassessed' as const }];
      if (probability(foundation.masteryScore) < .65) return [{ skillId: foundation.skillId, skillName: foundation.skillName, status: 'needs-practice' as const }];
      return [];
    });
    const priority: Priority = !observed ? 'diagnostic' : predicted < .65 ? 'focus' : isDue ? 'review' : skill.practiceCount < 5 ? 'diagnostic' : 'maintain';
    const reasons: string[] = [];
    if (!observed) reasons.push('Chưa có lượt luyện; làm một lượt để đánh giá kỹ năng.');
    else if (predicted < .65) reasons.push('Kết quả dự đoán còn thấp; ưu tiên luyện để củng cố.');
    else if (isDue) reasons.push('Đã đến lịch ôn dự kiến; kiểm tra lại khả năng vận dụng.');
    else if (skill.practiceCount < 5) reasons.push('Dữ liệu còn ít; luyện thêm để hiểu rõ khả năng hiện tại.');
    else reasons.push('Duy trì kỹ năng bằng những câu hỏi phù hợp.');
    if (observed && predicted < .65 && isDue) reasons.push('Kỹ năng này cũng đã đến lịch ôn dự kiến.');
    if (observed && last === null) reasons.push('Chưa có thời điểm luyện hợp lệ để lên lịch ôn.');
    for (const foundation of foundations) {
      reasons.push(foundation.status === 'unassessed'
        ? `Có thể kiểm tra nền tảng: ${foundation.skillName}; bạn vẫn có thể luyện kỹ năng này.`
        : `Có thể củng cố nền tảng: ${foundation.skillName}; bạn vẫn có thể luyện kỹ năng này.`);
    }
    const uncertainty = observed ? Math.max(0, 1 - skill.practiceCount / 10) : 1;
    const weakness = observed ? 1 - predicted : 0;
    const review = isDue ? Math.min(1, .5 + (now.getTime() - due!) / (intervalDays * DAY_MS * 2)) : 0;
    const score = (!observed ? .45 : .5 * weakness) + .2 * uncertainty + .3 * review - Math.min(.16, foundations.length * .08);
    const topic = topicForSkill(skill.skillCode);
    const lesson = [...lessons].filter(item => item.skillId === skill.skillId &&
      (!topic || topicForLesson({ ...item, skill: { code: skill.skillCode } }).id === topic.id))
      .sort((a, b) => a.id - b.id)[0];
    return {
      skillId: skill.skillId, skillCode: skill.skillCode, skillName: skill.skillName, part: skill.part,
      priority, score: Math.round(score * 1_000_000) / 1_000_000, reasons,
      reviewDueAt: due === null ? null : new Date(due).toISOString(),
      lesson: lesson ? { id: lesson.id, title: lesson.title, part: lesson.part } : null,
      foundations,
    };
  });
  items.sort((a, b) => b.score - a.score || a.skillId - b.skillId);
  // Reserve one visible slot for a due review: a large unassessed curriculum
  // must not indefinitely hide reviews behind identical cold-start scores.
  const dueIndex = items.findIndex(item => item.reviewDueAt !== null &&
    new Date(item.reviewDueAt).getTime() <= now.getTime());
  if (dueIndex >= 3) items.splice(2, 0, ...items.splice(dueIndex, 1));
  return { version: 'learning-plan-v1' as const, generatedAt: now.toISOString(), items };
}
