import { ArrayMaxSize, ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsInt, IsNotEmpty, Max, Min, ValidateIf } from 'class-validator';
import { ExamType } from '@prisma/client';

export class StartExamDto {
  @IsNotEmpty({ message: 'examType không được để trống' })
  @IsEnum(ExamType, { message: 'examType phải là FULL, MINI, PART_5 hoặc CUSTOM' })
  examType: ExamType;

  @ValidateIf(value => value.examType === 'CUSTOM' || value.parts !== undefined)
  @IsArray()
  @ArrayNotEmpty({ message: 'Chọn ít nhất một Part để luyện thi.' })
  @ArrayMaxSize(7)
  @ArrayUnique({ message: 'Không chọn trùng Part.' })
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  parts?: number[];
}
