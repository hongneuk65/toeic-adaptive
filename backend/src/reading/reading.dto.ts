import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export class PersonalReadingDto {
  @IsString() @MaxLength(200) title: string;
  @IsString() @MaxLength(20000) text: string;
}
export class ReadingProgressDto {
  @IsObject() answers: Record<string, unknown>;
  @IsInt() @Min(0) @Max(7) currentIndex: number;
  @IsInt() @Min(0) @Max(86400) elapsedSeconds: number;
}
export class ReadingTutorDto {
  @IsIn(['HINT', 'WORD', 'STRUCTURE', 'ANSWER', 'EVIDENCE']) mode: string;
  @IsString() @MaxLength(600) message: string;
  @IsOptional() @IsInt() @Min(0) @Max(7) questionIndex?: number;
  @IsOptional() @IsObject() selected?: {
    start: number;
    end: number;
    text: string;
  };
}
export class ReadingWordDto {
  @IsInt() @Min(0) start: number;
  @IsInt() @Min(1) end: number;
  @IsString() @MaxLength(120) word: string;
  @IsString() @MaxLength(1500) meaning: string;
  @IsOptional() @IsString() @MaxLength(1500) notes?: string;
}
export class ReadingReportDto {
  @IsString() @MaxLength(1000) reason: string;
  @IsOptional() @IsInt() @Min(0) @Max(7) questionIndex?: number;
}
export class ReadingDraftDto extends PersonalReadingDto {
  @IsString() @MaxLength(100) topic: string;
  @IsIn(['EMAIL', 'NOTICE', 'ADVERTISEMENT', 'MESSAGE', 'ARTICLE'])
  kind: string;
  @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty: string;
  @IsOptional() questions?: unknown;
  @IsOptional() @IsBoolean() aiDraft?: boolean;
}
export class ReadingPublishDto {
  @IsInt() @Min(1) versionId: number;
}
