import { Prisma } from '@prisma/client';

// Public fields only: never expose grading data before submission.
export const questionSelect = {
  id: true, part: true, passage: true, audioUrl: true, imageUrl: true,
  content: true, optionA: true, optionB: true, optionC: true, optionD: true,
} satisfies Prisma.QuestionSelect;