import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsInt, Min, ValidateNested } from 'class-validator';

export class SubmitAnswerItemDto {
  @IsInt()
  @Min(1)
  questionId: number;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'selectedAnswer phải là A, B, C hoặc D' })
  selectedAnswer: string;
}

export class SubmitExamDto {
  @IsInt()
  @Min(1)
  attemptId: number;

  @IsArray()
  @ArrayMaxSize(200)
  @ArrayUnique((answer: SubmitAnswerItemDto) => answer.questionId)
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  answers: SubmitAnswerItemDto[];
}
