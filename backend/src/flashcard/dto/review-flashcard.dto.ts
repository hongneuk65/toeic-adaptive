import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
export class ReviewFlashcardDto {
  @IsBoolean() known: boolean;
  @IsOptional() @IsUUID() attemptId?: string;
  @IsOptional() @IsIn(['typed', 'self_report']) recallMode?: 'typed' | 'self_report';
  @IsOptional() @IsString() @MaxLength(200) response?: string;
  @IsOptional() @IsInt() @Min(0) @Max(86400000) elapsedMs?: number;
}
