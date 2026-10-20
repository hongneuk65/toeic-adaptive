import { Type } from 'class-transformer';
import { IsInt, Min, IsArray, ArrayMaxSize, ArrayUnique, ValidateNested } from 'class-validator';
import { SubmitAnswerItemDto } from './submit-exam.dto';
export class SaveDraftDto {
  @IsInt() @Min(1) revision: number;
  @IsArray() @ArrayMaxSize(200) @ArrayUnique((answer: SubmitAnswerItemDto) => answer.questionId)
  @ValidateNested({ each: true }) @Type(() => SubmitAnswerItemDto)
  answers: SubmitAnswerItemDto[];
}
