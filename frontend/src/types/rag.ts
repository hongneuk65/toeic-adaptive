export interface RetrievedSource {
  id?: string;
  sourceUri?: string;
  version?: string;
  contentHash?: string;
  title: string;
  category: string;
  sourceType: string;
  lessonId?: number | null;
}

export interface PersonalizedExplanationResult {
  questionId: number;
  part: number;
  selectedAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  learnerMastery: {
    skillCode: string;
    skillName: string;
    masteryScore: number | null;
    evidenceStatus?: 'practiced' | 'unassessed';
    levelDescription: string;
  } | null;
  explanation: string;
  presentation?: { mode: 'auto' | 'simpler' | 'example' | 'deeper'; style: string; description: string; version: string };
  answerOrigin?: 'submitted_attempt' | 'practice_input';
  grounding?: 'approved_sources' | 'insufficient';
  knowledgeNotice?: string;
  generationStatus?: 'generated' | 'stored_only';
  contextWarnings?: string[];
  learnerEvidence?: { id: number; name: string; attempts: number; distinctQuestions: number; recentAttempts: number; status: 'insufficient' | 'stale' | 'sufficient' }[];
  sections: {
    misconceptionAnalysis: string;
    correctAnswerExplanation: string;
    keyTakeawayRule: string;
    recommendedAction: string;
  };
  retrievedSources: RetrievedSource[];
}

export interface RoadmapStep {
  skillId: number;
  skillCode: string;
  skillName: string;
  part: number;
  category: string;
  masteryScore: number;
  priority: 'P0_CRITICAL' | 'P1_FOCUS' | 'P2_ADVANCED';
  priorityLabel: string;
  recommendedLesson: {
    id: number;
    title: string;
    part: number;
  } | null;
  practiceCount: number;
  actionText: string;
  estimatedPointGain: number;
}

export interface PersonalizedRoadmapResult {
  summary: {
    totalSkillsTracked: number;
    criticalCount: number;
    focusCount: number;
    masteredCount: number;
    averageMastery: number;
    estimatedPotentialIncrease: number;
    weakestPart: number;
  };
  prioritySteps: RoadmapStep[];
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string | Date;
}
