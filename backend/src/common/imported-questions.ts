import { QuestionStatus } from '@prisma/client';

// The crawl importer preserves this source marker; generated bulk fixtures have none.
// Only PUBLISHED items reach learner banks; admin drafts and archived items stay out.
export const importedQuestions = { status: QuestionStatus.PUBLISHED, OR: [
  { explanation: { startsWith: '[santa-ednet:' } },
  { explanation: { startsWith: '[admin-question]' } },
] };
