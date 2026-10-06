export interface ReadingEvidence {
  start: number;
  end: number;
  text: string;
}
export interface ReadingQuestion {
  type: string;
  prompt: string;
  options: string[];
  evidenceRequired: boolean;
  answer?: number;
  explanation?: string;
  evidence?: ReadingEvidence[];
}
export interface ReadingVersion {
  id: number;
  articleId: number;
  revision: number;
  title: string;
  text: string;
  topic: string;
  kind: string;
  difficulty: string;
  origin: string;
  reviewed: boolean;
  questions: ReadingQuestion[];
}
export interface ReadingAttempt {
  id: number;
  versionId: number;
  tryNumber: number;
  currentIndex: number;
  answers: Record<string, { selected: number; evidence: ReadingEvidence[] }>;
  hints: string[];
  elapsedSeconds: number;
  correct: number | null;
  total: number | null;
  submittedAt: string | null;
  version: ReadingVersion;
}
export interface ReadingArticle {
  id: number;
  title: string;
  text?: string;
  ownerId: number | null;
  status: string;
  error: string | null;
  generationAttempts: number;
  version: ReadingVersion | null;
}
export interface ReadingCatalog {
  articles: ReadingArticle[];
  attempts: {
    id: number;
    versionId: number;
    currentIndex: number;
    submittedAt: string | null;
    correct: number | null;
    total: number | null;
    tryNumber: number;
  }[];
  limits: {
    maxText: number;
    maxQuestions: number;
    generations: number;
    tutorCalls: number;
  };
}
