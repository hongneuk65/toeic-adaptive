/**
 * Chọn số ít câu "hay sai" thuộc kỹ năng yếu để ôn lại.
 *
 * Chỉ gợi ý tối đa vài kỹ năng và vài câu mỗi kỹ năng để người học không bị
 * ngợp bởi toàn bộ lịch sử sai. Một câu được xem là đã khắc phục khi trả lời
 * đúng liên tiếp RESOLVE_STREAK lần sau lần sai gần nhất; lần đúng đầu tiên
 * chỉ làm câu đó tạm nghỉ SPACING_MS trước khi được kiểm tra lại. Lần đúng ngay
 * sau khi vừa xem đáp án (trong MIN_GAP_AFTER_WRONG_MS) hoặc lặp lại trong cùng
 * khoảng nghỉ không được tính, để việc nhớ đáp án vừa xem không xóa câu khỏi danh sách.
 * Đây là quy tắc sản phẩm, không phải ngưỡng đã được kiểm chứng thực nghiệm.
 */
export const MISTAKE_REVIEW_LIMITS = {
  skills: 3,
  questionsPerSkill: 3,
  candidatesPerSkill: 8,
  recentAnswersPerSkill: 20,
  resolveStreak: 2,
  spacingMs: 24 * 60 * 60 * 1000,
  minGapAfterWrongMs: 10 * 60 * 1000,
  weakMastery: 0.6,
  weakWrongRate: 0.4,
} as const;
export type MistakeReviewLimits = { [K in keyof typeof MISTAKE_REVIEW_LIMITS]: number };

export interface MistakeHistoryRow { questionId: number; skillId: number; isCorrect: boolean; createdAt: Date }
export interface MistakeSkillInfo { skillId: number; skillName: string; part: number; masteryScore: number | null }

export interface QuestionMistakeSummary {
  questionId: number;
  skillIds: number[];
  attempts: number;
  wrongCount: number;
  lastWrongAt: Date | null;
  lastAnswerAt: Date;
  correctStreak: number;
  due: boolean;
  open: boolean;
}

export interface MistakeReviewQuestion {
  questionId: number;
  wrongCount: number;
  attempts: number;
  lastWrongAt: string;
  predictedProbability: number | null;
}

export interface MistakeReviewSkill {
  skillId: number;
  skillName: string;
  part: number;
  masteryScore: number | null;
  recentWrongRate: number;
  dueCount: number;
  reason: string;
  questions: MistakeReviewQuestion[];
}

export interface MistakeReviewPlan {
  skills: MistakeReviewSkill[];
  openMistakes: number;
  dueMistakes: number;
  hiddenDueMistakes: number;
}

/** Một lượt trả lời ghi một dòng cho mỗi kỹ năng của câu; gộp lại thành một lượt. */
export function summarizeQuestions(rows: MistakeHistoryRow[], now: Date, limits: MistakeReviewLimits = MISTAKE_REVIEW_LIMITS) {
  const answers = new Map<string, { questionId: number; isCorrect: boolean; at: Date; skills: Set<number> }>();
  for (const row of rows) {
    const key = `${row.questionId}:${row.createdAt.getTime()}`;
    const answer = answers.get(key) ?? { questionId: row.questionId, isCorrect: row.isCorrect, at: row.createdAt, skills: new Set<number>() };
    answer.skills.add(row.skillId);
    answers.set(key, answer);
  }
  const byQuestion = new Map<number, Array<{ isCorrect: boolean; at: Date; skills: Set<number> }>>();
  for (const answer of answers.values()) {
    const list = byQuestion.get(answer.questionId) ?? [];
    list.push(answer);
    byQuestion.set(answer.questionId, list);
  }
  const result = new Map<number, QuestionMistakeSummary>();
  for (const [questionId, list] of byQuestion) {
    list.sort((a, b) => a.at.getTime() - b.at.getTime());
    let wrongCount = 0; let lastWrongAt: Date | null = null; let streak = 0; let lastCorrectAt: Date | null = null;
    const skills = new Set<number>();
    for (const answer of list) {
      answer.skills.forEach(id => skills.add(id));
      if (answer.isCorrect) {
        const sinceWrong = lastWrongAt ? answer.at.getTime() - lastWrongAt.getTime() : Infinity;
        const sinceCorrect = lastCorrectAt && streak > 0 ? answer.at.getTime() - lastCorrectAt.getTime() : Infinity;
        if (streak === 0 ? sinceWrong >= limits.minGapAfterWrongMs : sinceCorrect >= limits.spacingMs) { streak += 1; lastCorrectAt = answer.at; }
      }
      else { wrongCount += 1; lastWrongAt = answer.at; streak = 0; }
    }
    const open = wrongCount > 0 && streak < limits.resolveStreak;
    const due = open && (streak === 0 || (lastCorrectAt !== null && now.getTime() - lastCorrectAt.getTime() >= limits.spacingMs));
    result.set(questionId, { questionId, skillIds: [...skills].sort((a, b) => a - b), attempts: list.length, wrongCount, lastWrongAt,
      lastAnswerAt: list[list.length - 1].at, correctStreak: streak, due, open });
  }
  return result;
}

function recentWrongRate(rows: MistakeHistoryRow[], skillId: number, limit: number) {
  const seen = new Set<string>();
  const recent = rows.filter(r => r.skillId === skillId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .filter(r => { const key = `${r.questionId}:${r.createdAt.getTime()}`; if (seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, limit);
  return recent.length ? recent.filter(r => !r.isCorrect).length / recent.length : 0;
}

const percent = (value: number) => `${Math.round(value * 100)}%`;

/**
 * predictions: xác suất làm đúng do DAS3H dự đoán cho từng câu (nếu có).
 * Câu dự đoán còn dễ sai được ưu tiên trước câu đã gần nắm được.
 */
export function planMistakeReview(rows: MistakeHistoryRow[], skills: MistakeSkillInfo[], now: Date,
  predictions: Map<number, number> = new Map(), excludedQuestionIds: Set<number> = new Set(), limits: MistakeReviewLimits = MISTAKE_REVIEW_LIMITS): MistakeReviewPlan {
  const summaries = summarizeQuestions(rows, now, limits);
  const open = [...summaries.values()].filter(q => q.open && !excludedQuestionIds.has(q.questionId));
  const due = open.filter(q => q.due);
  const info = new Map(skills.map(s => [s.skillId, s]));
  const candidates = [...new Set(due.flatMap(q => q.skillIds))].flatMap(skillId => {
    const skill = info.get(skillId);
    if (!skill) return [];
    const questions = due.filter(q => q.skillIds.includes(skillId));
    const wrongRate = recentWrongRate(rows, skillId, limits.recentAnswersPerSkill);
    const repeated = questions.some(q => q.wrongCount >= 2);
    const weak = (skill.masteryScore !== null && skill.masteryScore < limits.weakMastery) || wrongRate >= limits.weakWrongRate || repeated;
    if (!weak) return [];
    const strength = skill.masteryScore ?? 1 - wrongRate;
    const score = questions.reduce((sum, q) => sum + q.wrongCount, 0) * (1 - strength) + questions.length * 0.01;
    return [{ skill, questions, wrongRate, score }];
  }).sort((a, b) => b.score - a.score || a.skill.skillId - b.skill.skillId);

  const used = new Set<number>();
  const chosen: MistakeReviewSkill[] = [];
  for (const candidate of candidates) {
    if (chosen.length >= limits.skills) break;
    const ranked = candidate.questions.filter(q => !used.has(q.questionId)).sort((a, b) =>
      b.wrongCount - a.wrongCount
      || (predictions.get(a.questionId) ?? 1) - (predictions.get(b.questionId) ?? 1)
      || (b.lastWrongAt?.getTime() ?? 0) - (a.lastWrongAt?.getTime() ?? 0)
      || a.questionId - b.questionId).slice(0, limits.questionsPerSkill);
    if (!ranked.length) continue;
    ranked.forEach(q => used.add(q.questionId));
    const { skill } = candidate;
    const parts = [`${candidate.questions.length} câu cần ôn`];
    if (candidate.wrongRate > 0) parts.push(`sai ${percent(candidate.wrongRate)} lượt gần đây`);
    if (skill.masteryScore !== null) parts.push(`mức nắm vững ${percent(skill.masteryScore)}`);
    chosen.push({ skillId: skill.skillId, skillName: skill.skillName, part: skill.part, masteryScore: skill.masteryScore,
      recentWrongRate: candidate.wrongRate, dueCount: candidate.questions.length, reason: parts.join(' · '),
      questions: ranked.map(q => ({ questionId: q.questionId, wrongCount: q.wrongCount, attempts: q.attempts,
        lastWrongAt: (q.lastWrongAt ?? q.lastAnswerAt).toISOString(), predictedProbability: predictions.get(q.questionId) ?? null })) });
  }
  return { skills: chosen, openMistakes: open.length, dueMistakes: due.length, hiddenDueMistakes: Math.max(0, due.length - used.size) };
}

/** Các câu ứng viên cần dự đoán: lấy rộng hơn số câu hiển thị rồi xếp lại theo dự đoán. */
export function candidateQuestionIds(plan: MistakeReviewPlan) {
  return plan.skills.flatMap(s => s.questions.map(q => q.questionId));
}
