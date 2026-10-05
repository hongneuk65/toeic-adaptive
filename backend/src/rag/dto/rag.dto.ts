import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExplainErrorDto {
  @IsInt()
  @IsNotEmpty()
  questionId: number;

  @IsString()
  @IsNotEmpty()
  selectedAnswer: string; // "A", "B", "C", "D"

  @IsOptional()
  @IsString()
  userNote?: string;
}

export class ChatTutorDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsInt()
  questionId?: number;

  @IsOptional()
  @IsString()
  skillCode?: string;
}
