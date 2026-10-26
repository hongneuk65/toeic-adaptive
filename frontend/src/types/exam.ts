export type ExamRenderNode =
  | { type: 'text'; text: string; bold?: boolean; underline?: boolean }
  | { type: 'blank'; number: number }
  | { type: 'paragraph' | 'table' | 'row' | 'group'; children: ExamRenderNode[] }
  | { type: 'cell'; children: ExamRenderNode[]; colSpan?: number; rowSpan?: number }
  | { type: 'image'; url: string; alt: string };

export interface ExamStimulus {
  version: 1;
  groupId: string;
  questionPosition: number;
  audioDurationSeconds?: number;
  documents: { id: string; blocks: ExamRenderNode[] }[];
}

export interface ExamQuestion {
  id: number;
  part: number;
  passage?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  stimulus?: ExamStimulus | null;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface ExamSession {
  attemptId: number;
  examType: 'FULL' | 'MINI' | 'PART_5' | 'CUSTOM';
  selectedParts?: number[];
  startedAt: string;
  deadlineAt?: string;
  submittedAt?: string | null;
  draftAnswers?: { questionId: number; selectedAnswer: string }[];
  draftRevision?: number;
  totalQuestions: number;
  questions: ExamQuestion[];
  listeningPlan?: {
    pacingVersion?: 'part-response-v1';
    targetSeconds: number;
    audioSeconds: number;
    restSeconds: number;
    groups: { firstQuestionId: number; audioSeconds: number; restSeconds: number; questionCount: number }[];
  } | null;
}
