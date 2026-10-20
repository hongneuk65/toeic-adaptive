import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';

export class AdaptiveAnswerDto {
  @IsUUID()
  attemptId: string;

  @IsInt()
  @Min(1)
  questionId: number;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value)
  @IsIn(['A', 'B', 'C', 'D'])
  selectedAnswer: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  skillId?: number;
}

// Administrative diagnostic endpoints only; learners submit actual answers.
export class RecordMasteryDto {
  @IsInt()
  @Min(1)
  questionId: number;

  @IsBoolean()
  isCorrect: boolean;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  skillIds: number[];
}