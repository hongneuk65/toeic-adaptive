import { IsBoolean, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListeningCatalogQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 24;
  @IsOptional() @IsString() @MaxLength(200) search?: string;
  @IsOptional() @IsIn(['AUDIO', 'VIDEO', 'YOUTUBE']) kind?: string;
}

export class SourceDto {
  @IsString() @MaxLength(200) title: string;
  @IsIn(['YOUTUBE', 'AUDIO', 'VIDEO']) kind: string;
  @IsString() @MaxLength(2000) url: string;
  @IsOptional() @IsBoolean() published?: boolean;
}
export class SegmentDto {
  @IsInt() @Min(1) sourceId: number;
  @IsNumber() @Min(0) @Max(86400) start: number;
  @IsNumber() @Min(0) @Max(86400) end: number;
}
export class SubtitleDto {
  @IsString() @MaxLength(200000) text: string;
  @IsIn(['SUBTITLES', 'TEXT']) format: string;
  @IsOptional() @IsNumber() @Min(0) @Max(86400) start?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(86400) end?: number;
}
export class TranscriptRequestDto {
  @IsOptional() @IsNumber() @Min(0) @Max(86400) start?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(86400) end?: number;
}
export class ProgressDto {
  @IsOptional() @IsInt() @Min(0) currentIndex?: number;
  @IsOptional() @IsIn(['CLOZE', 'DICTATION', 'SPEAK']) mode?: string;
  @IsOptional() @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty?: string;
  @IsOptional() @IsBoolean() favorite?: boolean;
}
export class AnswerDto {
  @IsInt() @Min(1) unitId: number;
  @IsIn(['CLOZE', 'DICTATION', 'SPEAK']) mode: string;
  @IsIn(['EASY', 'MEDIUM', 'HARD']) difficulty: string;
  @IsString() @MaxLength(3000) answer: string;
}
export class ReportDto { @IsString() @MaxLength(1000) reason: string; }
export class PublishDto { @IsBoolean() published: boolean; }
export class SettingsDto {
  @IsInt() @Min(30) @Max(300) maxSegmentSeconds: number;
  @IsInt() @Min(30) @Max(180) defaultSegmentSeconds: number;
  @IsInt() @Min(1) @Max(168) transcriptTtlHours: number;
  @IsInt() @Min(1) @Max(60) requestsPerHour: number;
  @IsInt() @Min(1024) @Max(200000) maxSubtitleBytes: number;
  @IsInt() @Min(10) @Max(120) maxRecordingSeconds: number;
}
