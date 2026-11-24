import { BadRequestException } from '@nestjs/common';

export const QUESTION_MEDIA_FIELDS = ['passage', 'audioUrl', 'imageUrl'] as const;
export type QuestionMediaField = (typeof QUESTION_MEDIA_FIELDS)[number];
export type QuestionMedia = Partial<Record<QuestionMediaField, string | null>>;

const LABELS: Record<QuestionMediaField, string> = {
  passage: 'Đoạn văn',
  audioUrl: 'Đường dẫn âm thanh',
  imageUrl: 'Đường dẫn hình ảnh',
};

/** Empty optional text is stored as NULL so `{ not: null }` filters mean "has media". */
export function blankToNull(field: QuestionMediaField, value: string | null | undefined): string | null | undefined {
  if (value === undefined || value === null) return value;
  if (!value.trim()) return null;
  return field === 'passage' ? value : value.trim();
}

export function normalizeQuestionMedia<T extends QuestionMedia>(dto: T): T {
  const next = { ...dto };
  for (const field of QUESTION_MEDIA_FIELDS)
    if (field in next) next[field] = blankToNull(field, next[field]) as T[typeof field];
  return next;
}

/** Accept HTTPS media or a same-origin absolute path; reject other schemes. */
export function assertMediaUrls(media: QuestionMedia) {
  for (const field of ['audioUrl', 'imageUrl'] as const) {
    const value = media[field];
    if (value === undefined || value === null) continue;
    const local = value.startsWith('/') && !value.startsWith('//');
    let https = false;
    try { https = new URL(value).protocol === 'https:'; } catch { https = false; }
    if (!local && !https)
      throw new BadRequestException(`${LABELS[field]} phải bắt đầu bằng https:// hoặc là đường dẫn nội bộ bắt đầu bằng /`);
  }
}

/** TOEIC media each Part needs before a learner can answer the item. */
export function questionMediaProblems(part: number, media: QuestionMedia): string[] {
  const has = (field: QuestionMediaField) => !!media[field]?.trim();
  const problems: string[] = [];
  if (part === 1 && !has('imageUrl')) problems.push('Part 1 cần hình ảnh');
  if (part >= 1 && part <= 4 && !has('audioUrl')) problems.push(`Part ${part} cần âm thanh`);
  if ((part === 6 || part === 7) && !has('passage')) problems.push(`Part ${part} cần đoạn văn`);
  return problems;
}

export function assertQuestionMedia(part: number, media: QuestionMedia) {
  const problems = questionMediaProblems(part, media);
  if (problems.length) throw new BadRequestException(problems.join('; '));
}
