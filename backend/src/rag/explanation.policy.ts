import { SkillEvidence } from './learner-evidence.service';

export const EXPLANATION_MODES = ['auto', 'simpler', 'example', 'deeper'] as const;
export type ExplanationMode = typeof EXPLANATION_MODES[number];
export type ExplanationStyle = 'neutral' | 'foundation' | 'consolidation' | 'concise';
export function explanationPolicy(evidence: SkillEvidence[], mode: ExplanationMode = 'auto') {
  // These are conservative presentation heuristics, not validated proficiency bands.
  let style: ExplanationStyle = 'neutral';
  if (evidence.length && evidence.every(item => item.status === 'sufficient' && item.predictedSuccess !== null && Number.isFinite(item.predictedSuccess))) {
    const lowestPrediction = Math.min(...evidence.map(item => item.predictedSuccess!));
    style = lowestPrediction < 0.45 ? 'foundation' : lowestPrediction >= 0.7 ? 'concise' : 'consolidation';
  }
  const descriptions = { neutral: 'Giải thích rõ ràng, chưa kết luận trình độ', foundation: 'Giải thích từng bước', consolidation: 'Quy tắc và phân tích lựa chọn', concise: 'Giải thích ngắn và làm rõ sắc thái' };
  const instructions = {
    neutral: 'Lịch sử chưa đủ hoặc chưa gần đây cho một hay nhiều kỹ năng. Giải thích trung tính, dễ hiểu; không gán trình độ, điểm yếu hay nguyên nhân tâm lý.',
    foundation: 'Đi từng bước, định nghĩa thuật ngữ bằng tiếng Việt dễ hiểu và dùng ví dụ đơn giản.',
    consolidation: 'Tập trung quy tắc, đối chiếu từng phương án gây nhầm và cho ví dụ tương tự.',
    concise: 'Giải thích ngắn, tập trung sắc thái và lý do phương án gây nhầm không phù hợp.',
  };
  const requested = { auto: '', simpler: 'Người học yêu cầu: giải thích dễ hơn, chia nhỏ bước và giảm thuật ngữ.', example: 'Người học yêu cầu: cho một ví dụ mới, ghi rõ đây là ví dụ minh họa, không phải trích nguồn.', deeper: 'Người học yêu cầu: giải thích sâu hơn, bổ sung điều kiện áp dụng và đối chiếu lựa chọn.' };
  return { version: 'tutor-explanation-v1', mode, style, description: descriptions[style], instruction: `${instructions[style]}\n${requested[mode]}` };
}
