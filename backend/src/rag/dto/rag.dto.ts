import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, Max, IsIn, ValidateIf } from 'class-validator';
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

export class TutorChatScopeDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  screenMode?: string;


  @ValidateIf(v => v.screenKind !== undefined || v.screenId !== undefined)
  @IsIn(['vocabulary', 'theory', 'reading', 'listening', 'curriculum'])
  screenKind?: string;

  @ValidateIf(v => v.screenKind !== undefined || v.screenId !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  screenId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9999)
  screenIndex?: number;
  @ValidateIf(value => value.questionId !== undefined || value.attemptId !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  questionId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  attemptId?: number;
}

export class ChatTutorDto extends TutorChatScopeDto {
  @IsOptional()
  @IsString()
  @MaxLength(3000)
  screenResponse?: string;
  @IsOptional()
  @IsString()
  @MaxLength(160)
  pagePath?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message: string;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D', 'CHƯA_CHỌN'])
  selectedAnswer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  skillCode?: string;
}
