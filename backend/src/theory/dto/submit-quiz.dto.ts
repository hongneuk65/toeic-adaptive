import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsIn, IsInt, ValidateNested } from 'class-validator';

export class AnswerItemDto {
  @IsInt()
  questionId: number;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'selectedAnswer phải là A, B, C hoặc D' })
  selectedAnswer: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Danh sách câu trả lời không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}