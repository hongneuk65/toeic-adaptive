import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, IsIn } from 'class-validator';

export class ExplainErrorDto {
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
