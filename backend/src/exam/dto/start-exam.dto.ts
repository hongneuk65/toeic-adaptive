import { IsEnum, IsNotEmpty } from 'class-validator';
import { ExamType } from '@prisma/client';

export class StartExamDto {
  @IsNotEmpty({ message: 'examType không được để trống' })
  @IsEnum(ExamType, { message: 'examType phải là FULL, MINI hoặc PART_5' })
  examType: ExamType;
}