import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class PracticeVocabularyDto {
  @IsUUID() attemptId: string;
  @IsIn(['quiz', 'dictation']) mode: 'quiz' | 'dictation';
  @IsString() @MaxLength(200) response: string;
  @IsOptional() @IsInt() @Min(0) @Max(86400000) elapsedMs?: number;
}

export interface VocabularyPracticeResult {
  attemptId: string;
  mode: 'quiz' | 'dictation';
  cardId: number;
  correct: boolean;
  correctAnswer: string;
  meaning: string;
  phonetic?: string;
  example?: string;
  response: string;
  recordedAt: string;
  schedulingUpdated: false;
}
