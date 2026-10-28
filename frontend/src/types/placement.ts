import type { ExamQuestion } from './exam';

export type LearningGoal = 'FOUNDATION' | 'BALANCED' | 'CHALLENGE';
export interface PlacementPreferences { goal: LearningGoal; targetScore: number | null }
export interface PlacementResult {
  answered: number;
  correct: number;
  topics: { skillId: number; skillName: string; part: number; attempts: number; correct: number; independentGroups: number; status: 'needs-practice' | 'promising' | 'insufficient' }[];
  recommendations: { label: string; href: string }[];
  note: string;
}
export interface PlacementSession extends PlacementPreferences {
  reference?: { status: 'pending' | 'unavailable' | 'ready'; note: string; version?: string; observedAt?: string; itemCount?: number; expectedCorrect?: number; byPart?: { part: number; itemCount: number; expectedCorrect: number }[] };
  id: number;
  status: 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
  revision: number;
  answeredCount: number;
  minQuestions: number;
  maxQuestions: number;
  deadlineAt: string;
  currentGroup: { key: string; part: number; questions: ExamQuestion[]; restSeconds: number } | null;
  result: PlacementResult | null;
  policyVersion: string;
  limitations: string[];
}
export interface PlacementOverview {
  preferences: PlacementPreferences;
  active: PlacementSession | null;
  latest: PlacementSession | null;
  catalog: { available: boolean; reason?: string; adaptiveParts?: number[]; byPart: { part: number; groups: number }[] };
}
