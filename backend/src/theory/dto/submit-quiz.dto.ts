import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsIn, IsInt, Min, ValidateNested } from 'class-validator';

export class AnswerItemDto {
  @IsInt()
  @Min(1)
  questionId: number;

  @IsIn(['A', 'B', 'C', 'D'], { message: 'selectedAnswer phải là A, B, C hoặc D' })
  selectedAnswer: string;
}

export class SubmitQuizDto {
  @IsArray()
  @ArrayMaxSize(5)
  @ArrayUnique((answer: AnswerItemDto) => answer.questionId)
  @ArrayNotEmpty({ message: 'Danh sách câu trả lời không được để trống' })
  @ValidateNested({ each: true })
  @Type(() => AnswerItemDto)
  answers: AnswerItemDto[];
}