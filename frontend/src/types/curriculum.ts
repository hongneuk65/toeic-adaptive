export type CurriculumMinutes = 15 | 30 | 45 | 60;
export type CurriculumQuestionKind = 'knowledge' | 'reading' | 'listening' | 'vocabulary';
export interface CurriculumQuestion {
  id: string; kind: CurriculumQuestionKind; prompt: string; options: string[];
  answer?: number; explanation?: string;
}
export interface CurriculumUnitSummary {
  id: string; title: string; minutes: number; objectives: string[]; prerequisites: string[];
  unlocked: boolean; completed: boolean; bestScore: number | null; reviewStage: number; nextReviewAt: string | null;
}
export interface CurriculumTrack { id: string; title: string; band: string; description: string; units: CurriculumUnitSummary[] }
export interface CurriculumOverview {
  version: 'curriculum-v1'; tracks: CurriculumTrack[];
  enrollment: null | { trackId: string; minutesPerDay: CurriculumMinutes; startedAt: string; updatedAt: string };
  progress: { completed: number; total: number; reviewDue: number };
  daySummary?: { date: string; budgetMinutes: number; completedMinutes: number; remainingMinutes: number };
  today: (CurriculumUnitSummary & { reason: 'review' | 'new'; trackId: string })[];
  researchSources: { title: string; url: string }[];
}
export interface CurriculumUnit {
  id: string; title: string; objectives: string[]; prerequisites: string[]; minutes: number;
  knowledge: string; examples: { prompt: string; explanation: string }[];
  vocabulary: { word: string; meaning: string; example: string }[];
  reading: string; listening: string; guided: CurriculumQuestion[]; checkpoint: CurriculumQuestion[];
  trackId: string; access: CurriculumUnitSummary;
}
export interface CurriculumResult {
  attemptId: number; unitId: string; score: number; correct: number; total: number; passed: boolean;
  results: { questionId: string; selectedAnswer: number; correctAnswer: number; isCorrect: boolean; explanation: string }[];
  progress: CurriculumUnitSummary;
}
