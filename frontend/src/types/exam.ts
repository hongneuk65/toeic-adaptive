export interface ExamQuestion {
  id: number;
  part: number;
  passage?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  content: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
}

export interface ExamSession {
  attemptId: number;
  examType: 'FULL' | 'MINI' | 'PART_5';
  startedAt: string;
  totalQuestions: number;
  questions: ExamQuestion[];
}