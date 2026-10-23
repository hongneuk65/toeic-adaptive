import { type ReadingLearning, validateLearning } from './reading-generation.policy';

export const QUESTION_TYPES = [
  'MAIN',
  'DETAIL',
  'INFERENCE',
  'PURPOSE',
  'PARAPHRASE',
] as const;
export interface Evidence {
  start: number;
  end: number;
  text: string;
}
export interface ReadingQuestion {
  learning?: ReadingLearning;
  type: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  evidenceRequired: boolean;
  evidence: Evidence[];
}
export interface ReadingAnswer {
  selected: number;
  evidence: Evidence[];
}

function bounded(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && !!value.trim() && value.length <= maximum;
}
export function evidenceAt(text: string, raw: unknown): Evidence {
  if (!raw || typeof raw !== 'object')
    throw new Error('Bằng chứng không hợp lệ.');
  const item = raw as Evidence;
  if (
    !Number.isInteger(item.start) ||
    !Number.isInteger(item.end) ||
    item.start < 0 ||
    item.end <= item.start ||
    item.end > text.length ||
    typeof item.text !== 'string' ||
    text.slice(item.start, item.end) !== item.text
  )
    throw new Error('Bằng chứng phải khớp nguyên văn và vị trí trong bài.');
  return { start: item.start, end: item.end, text: item.text };
}
export function validateQuestions(
  text: string,
  value: unknown,
  maximum = 5,
  options: { sourceCrawl?: boolean } = {},
): ReadingQuestion[] {
  if (!Array.isArray(value) || !value.length || value.length > maximum)
    throw new Error('Số câu hỏi không hợp lệ.');
  const result = value.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object')
      throw new Error('Câu hỏi không hợp lệ.');
    const q = raw as ReadingQuestion;
    if (
      typeof q.evidenceRequired !== 'boolean' ||
      !QUESTION_TYPES.includes(q.type as (typeof QUESTION_TYPES)[number]) ||
      !bounded(q.prompt, 1000) ||
      !Array.isArray(q.options) ||
      q.options.length !== 4 ||
      q.options.some((option) => !bounded(option, 500)) ||
      new Set(q.options.map((option) => option.trim().toLowerCase())).size !==
        4 ||
      !Number.isInteger(q.answer) ||
      q.answer < 0 ||
      q.answer > 3 ||
      !bounded(q.explanation, 2000) ||
      !Array.isArray(q.evidence) ||
      (!q.evidence.length && (!options.sourceCrawl || q.evidenceRequired)) ||
      q.evidence.length > 5
    )
      throw new Error(
        'Cấu trúc câu hỏi, lựa chọn, đáp án hoặc lời giải không hợp lệ.',
      );
    return {
      ...(q.learning === undefined ? {} : { learning: validateLearning(q.learning) }),
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      evidenceRequired: q.evidenceRequired === true,
      evidence: q.evidence.map((item) => evidenceAt(text, item)),
    };
  });
  if (!options.sourceCrawl && result[0].type !== 'MAIN')
    throw new Error('Câu đầu tiên cần kiểm tra ý chính.');
  if (
    new Set(result.map((q) => q.prompt.trim().toLowerCase())).size !==
    result.length
  )
    throw new Error('Câu hỏi bị trùng.');
  return result;
}
export function parseGeneratedQuestions(
  text: string,
  raw: string,
  maximum: number,
) {
  const data = JSON.parse(
    raw
      .trim()
      .replace(/^```(?:json)?\s*/, '')
      .replace(/\s*```$/, ''),
  ) as { questions?: unknown };
  // Models quote exact spans; backend resolves unambiguous offsets in UTF-16 (same as browser Selection).
  if (Array.isArray(data.questions))
    for (const q of data.questions)
      if (Array.isArray(q?.evidence))
        q.evidence = q.evidence.map((e: Evidence) => {
          if (typeof e?.text !== 'string') return e;
          if (
            Number.isInteger(e.start) &&
            text.slice(e.start, e.end) === e.text
          )
            return e;
          const start = text.indexOf(e.text);
          if (start < 0 || text.indexOf(e.text, start + 1) >= 0)
            throw new Error('Bằng chứng AI thiếu hoặc vị trí không xác định.');
          return { start, end: start + e.text.length, text: e.text };
        });
  return validateQuestions(text, data.questions, maximum);
}
export function validateAnswers(
  text: string,
  questions: ReadingQuestion[],
  raw: unknown,
  complete = false,
): Record<string, ReadingAnswer> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new Error('Đáp án không hợp lệ.');
  const result: Record<string, ReadingAnswer> = {};
  for (const [key, value] of Object.entries(raw)) {
    const index = Number(key);
    const answer = value as ReadingAnswer;
    if (
      !Number.isInteger(index) ||
      String(index) !== key ||
      !questions[index] ||
      !answer ||
      !Number.isInteger(answer.selected) ||
      answer.selected < 0 ||
      answer.selected > 3 ||
      !Array.isArray(answer.evidence) ||
      answer.evidence.length > 3
    )
      throw new Error('Lựa chọn không hợp lệ.');
    result[key] = {
      selected: answer.selected,
      evidence: answer.evidence.map((item) => evidenceAt(text, item)),
    };
  }
  if (
    complete &&
    questions.some(
      (q, i) =>
        !result[i] || (q.evidenceRequired && !result[i].evidence.length),
    )
  )
    throw new Error('Hãy trả lời đủ câu và chọn bằng chứng cho câu yêu cầu.');
  return result;
}
export function publicQuestions(questions: ReadingQuestion[]) {
  return questions.map(({ type, prompt, options, evidenceRequired, learning }) => ({
    ...(learning ? { learningLevel: learning.level } : {}),
    type,
    prompt,
    options,
    evidenceRequired,
  }));
}
export function tutorContext(
  text: string,
  question: ReadingQuestion | undefined,
  submitted: boolean,
  selected: Evidence | undefined,
  message: string,
) {
  return JSON.stringify({
    passage: text,
    question: question
      ? submitted
        ? question
        : { type: question.type, prompt: question.prompt }
      : null,
    selected: selected || null,
    request: message,
  });
}
export function readingLimits() {
  const number = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(process.env[key]);
    return Number.isInteger(value) && value >= min && value <= max
      ? value
      : fallback;
  };
  return {
    maxText: number('READING_MAX_TEXT_CHARS', 10000, 1000, 20000),
    maxQuestions: number('READING_MAX_QUESTIONS', 5, 2, 8),
    generations: number('READING_GENERATIONS_PER_DAY', 5, 1, 30),
    tutorCalls: number('READING_TUTOR_PER_DAY', 30, 1, 100),
    timeoutMs: number('READING_AI_TIMEOUT_MS', 45000, 1000, 90000),
    maxTutorContext: number(
      'READING_TUTOR_MAX_CONTEXT_CHARS',
      12000,
      2000,
      30000,
    ),
  };
}
