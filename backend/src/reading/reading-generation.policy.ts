import type { ReadingQuestion } from './reading-core';

export const LEARNING_LEVELS = ['REMEMBER', 'UNDERSTAND', 'ANALYZE'] as const;
export interface ReadingLearning {
  level: typeof LEARNING_LEVELS[number];
  objective: string;
  sourceCardIds: string[];
}
export interface SourceCard { id: string; start: number; end: number; text: string; }

/** Lossless UTF-16 source windows; offsets share the browser Selection contract. */
export function sourceCards(text: string, maximum = 1800): SourceCard[] {
  if (!text.trim() || !Number.isSafeInteger(maximum) || maximum < 2) throw new Error('Nguồn không hợp lệ.');
  const cards: SourceCard[] = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + maximum, text.length);
    if (end < text.length) {
      const segment = text.slice(start, end);
      const boundary = Math.max(segment.lastIndexOf('\n\n'), segment.lastIndexOf('. '), segment.lastIndexOf(' '));
      if (boundary >= Math.floor(maximum / 2)) end = start + boundary + 1;
      const code = text.charCodeAt(end - 1);
      if (code >= 0xD800 && code <= 0xDBFF) end--;
    }
    cards.push({ id: `source-${cards.length + 1}`, start, end, text: text.slice(start, end) });
    start = end;
  }
  return cards;
}

export function validateLearning(value: unknown): ReadingLearning {
  if (!value || typeof value !== 'object') throw new Error('Thiếu mục tiêu học của câu hỏi.');
  const item = value as ReadingLearning;
  if (!LEARNING_LEVELS.includes(item.level) || typeof item.objective !== 'string' ||
      !item.objective.trim() || item.objective.length > 250 || !Array.isArray(item.sourceCardIds) ||
      !item.sourceCardIds.length || item.sourceCardIds.length > 32 ||
      item.sourceCardIds.some(id => typeof id !== 'string' || !/^source-[1-9]\d*$/.test(id)) ||
      new Set(item.sourceCardIds).size !== item.sourceCardIds.length) {
    throw new Error('Mục tiêu học hoặc đoạn nguồn không hợp lệ.');
  }
  return { level: item.level, objective: item.objective, sourceCardIds: [...item.sourceCardIds] };
}

/** Task categories, not calibrated question difficulty or measured learner mastery. */
export function validateGroundedLearning(questions: ReadingQuestion[], cards: SourceCard[]) {
  const expected: Record<string, ReadingLearning['level']> = { MAIN: 'UNDERSTAND', DETAIL: 'REMEMBER', PURPOSE: 'UNDERSTAND',
    PARAPHRASE: 'UNDERSTAND', INFERENCE: 'ANALYZE' };
  for (const question of questions) {
    const learning = validateLearning(question.learning);
    if (learning.level !== expected[question.type] || !question.evidenceRequired) {
      throw new Error('Mức xử lý thông tin hoặc yêu cầu bằng chứng không phù hợp.');
    }
    const covered = new Set(question.evidence.flatMap(e => cards.filter(c => e.start < c.end && e.end > c.start).map(c => c.id)));
    if (covered.size !== learning.sourceCardIds.length || learning.sourceCardIds.some(id => !covered.has(id))) {
      throw new Error('Câu hỏi phải trỏ đúng các đoạn nguồn chứa bằng chứng.');
    }
  }
}

function checkedRows(raw: string, questions: ReadingQuestion[]) {
  const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')) as { checks?: unknown };
  if (!Array.isArray(parsed.checks) || parsed.checks.length !== questions.length) throw new Error('Thiếu kết quả kiểm tra câu hỏi.');
  const seen = new Set<number>();
  const rows: { questionIndex: number; supportedAnswer: number; singleAnswer: boolean;
    explanationSupported: boolean; evidenceSufficient: boolean; objectiveAligned: boolean }[] = [];
  for (const value of parsed.checks) {
    if (!value || typeof value !== 'object') throw new Error('Kết quả kiểm tra không hợp lệ.');
    const c = value as { questionIndex: number; supportedAnswer: number; singleAnswer: boolean;
      explanationSupported: boolean; evidenceSufficient: boolean; objectiveAligned: boolean };
    if (!Number.isInteger(c.questionIndex) || !questions[c.questionIndex] || seen.has(c.questionIndex) ||
        c.supportedAnswer !== questions[c.questionIndex].answer || c.singleAnswer !== true) {
      throw new Error('Câu hỏi chưa vượt qua kiểm tra đáp án và bằng chứng nguồn.');
    }
    seen.add(c.questionIndex);
    rows.push(c);
  }
  return rows;
}

export function assertAnswerReview(raw: string, questions: ReadingQuestion[]) {
  checkedRows(raw, questions);
}

export function assertGenerationReview(raw: string, questions: ReadingQuestion[]) {
  for (const row of checkedRows(raw, questions)) {
    if (row.explanationSupported !== true || row.evidenceSufficient !== true || row.objectiveAligned !== true) {
      throw new Error('Lời giải, bằng chứng hoặc mục tiêu chưa vượt qua kiểm tra nguồn.');
    }
  }
}
