import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, ValidateNested } from 'class-validator';

export class SubmitAnswerItemDto {
  @IsInt()
  questionId: number;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'selectedAnswer phải là A, B, C hoặc D' })
  selectedAnswer: string;
}

export class SubmitExamDto {
  @IsInt()
  attemptId: number;

  @IsArray()
  @ArrayNotEmpty({ message: 'Danh sách đáp án không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => SubmitAnswerItemDto)
  answers: SubmitAnswerItemDto[];
}
