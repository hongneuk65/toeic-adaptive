import type { ExamQuestion, ExamSession } from '../types/exam';

export interface ExamGroup { key: string; part: number; indices: number[] }

// Groups are contiguous: reused media later in an exam must never merge unrelated questions.
export function buildExamGroups(questions: readonly ExamQuestion[]): ExamGroup[] {
  const groups: ExamGroup[] = [];
  let previousIdentity: string | undefined;
  questions.forEach((question, index) => {
    const shared = question.part === 3 || question.part === 4
      ? question.audioUrl ? `${question.audioUrl}:${question.stimulus?.groupId ?? ''}` : question.stimulus?.groupId
      : question.part === 6 || question.part === 7
        ? question.stimulus?.groupId || question.passage
        : undefined;
    const identity = shared ? `${question.part}:${shared}` : `${question.part}:question:${question.id}`;
    const previous = groups.at(-1);
    if (previous && previousIdentity === identity) previous.indices.push(index);
    else groups.push({ key: `part-${question.part}-question-${question.id}`, part: question.part, indices: [index] });
    previousIdentity = identity;
  });
  return groups;
}

export function displayExamNumber(examType: ExamSession['examType'], index: number, questions?: readonly ExamQuestion[]): number {
  if (examType === 'CUSTOM' && questions?.[index]) {
    const part = questions[index].part;
    const first = [1, 7, 32, 71, 101, 131, 147][part - 1];
    return first + questions.slice(0, index).filter(question => question.part === part).length;
  }
  return examType === 'PART_5' ? 101 + index : index + 1;
}

export function readingNeighbor(questions: readonly ExamQuestion[], index: number, direction: -1 | 1): number {
  for (let next = index + direction; next >= 0 && next < questions.length; next += direction) {
    if (questions[next].part >= 5) return next;
  }
  return index;
}

