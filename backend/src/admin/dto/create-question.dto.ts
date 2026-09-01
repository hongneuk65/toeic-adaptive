import { ArrayNotEmpty, IsArray, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { Difficulty } from '@prisma/client';

export class CreateQuestionDto {
  @IsInt()
  @Min(1)
  @Max(7)
  part: number;

  @IsOptional()
  @IsString()
  passage?: string;

  @IsOptional()
  @IsString()
  audioUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsNotEmpty()
  optionA: string;

  @IsString()
  @IsNotEmpty()
  optionB: string;

  @IsString()
  @IsNotEmpty()
  optionC: string;

  @IsString()
  @IsNotEmpty()
  optionD: string;

  @IsString()
  @IsIn(['A', 'B', 'C', 'D'], { message: 'correctAnswer phải là A, B, C hoặc D' })
  correctAnswer: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  // Hỗ trợ Q-matrix: 1 câu hỏi có thể liên kết nhiều skill
  @IsArray()
  @ArrayNotEmpty({ message: 'Câu hỏi phải gắn với ít nhất 1 skill' })
  @IsInt({ each: true })
  skillIds: number[];
}