import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, IsIn } from 'class-validator';
import { EXPLANATION_MODES, type ExplanationMode } from '../explanation.policy';

export class ExplainErrorDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  attemptId?: number;

  @IsOptional()
  @IsIn(EXPLANATION_MODES)
  mode?: ExplanationMode;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  questionId: number;

  @IsString()
  @IsIn(['A', 'B', 'C', 'D', 'CHƯA_CHỌN'])
  @IsNotEmpty()
  selectedAnswer: string; // "A", "B", "C", "D"

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  userNote?: string;
}

export class ChatTutorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  questionId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  skillCode?: string;
}
