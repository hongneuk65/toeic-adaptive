import { IsOptional, IsIn, IsInt, IsObject, IsString, Matches } from 'class-validator';
export class EnrollCurriculumDto {
  @IsString() @Matches(/^[a-z0-9-]{1,60}$/) trackId!: string;
  @IsInt() @IsIn([15, 30, 45, 60]) minutesPerDay!: number;
}
export class SubmitCurriculumDto {
  @IsOptional() @IsString() @Matches(/^[a-f0-9]{64}$/) contentVersion?: string;
  @IsString() @Matches(/^[a-zA-Z0-9_-]{8,100}$/) requestId!: string;
  @IsObject() answers!: Record<string, number>;
}
