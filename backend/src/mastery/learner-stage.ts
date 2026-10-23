interface SkillEvidence { practiceCount: number; masteryScore: number; part?: number }
/** Product guidance from observed skills, never a TOEIC/CEFR level estimate. */
export function learnerStage(skills: SkillEvidence[]) {
  const observed = skills.filter(s => s.practiceCount > 0 && Number.isFinite(s.masteryScore) && s.masteryScore >= 0 && s.masteryScore <= 1);
  const count = observed.reduce((sum, s) => sum + s.practiceCount, 0);
  const score = observed.length ? observed.reduce((sum, s) => sum + s.masteryScore, 0) / observed.length : null;
  const stage = observed.length < 2 || count < 10 ? 'unassessed' : score! < .65 ? 'foundation' : score! < .85 ? 'developing' : 'consolidating';
  const labels = { unassessed: 'Đang tìm điểm bắt đầu', foundation: 'Củng cố nền tảng', developing: 'Phát triển kỹ năng', consolidating: 'Ôn vững và mở rộng' };
  return { stage, label: labels[stage], observedSkills: observed.length, practiceCount: count,
    description: stage === 'unassessed' ? 'Chưa đủ bằng chứng để chọn mức học chắc chắn. Bắt đầu với bài ngắn và cập nhật sau khi luyện.' : 'Định hướng từ các kỹ năng đã luyện; không phải mức CEFR hoặc điểm TOEIC được đo.' };
}
