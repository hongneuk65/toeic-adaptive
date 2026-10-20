import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Difficulty, Role } from '@prisma/client';

export class AdminQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20;
  @IsOptional() @IsString() @MaxLength(200) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(7) part?: number;
  @IsOptional() @IsIn(['true', 'false']) resolved?: string;
  @IsOptional() @IsIn(['CRAWL', 'OTHER']) source?: 'CRAWL' | 'OTHER';
}
export class UpdateQuestionDto {
  @IsOptional() @IsInt() @Min(1) @Max(7) part?: number;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(20000) content?: string;
  @IsOptional() @IsString() @MaxLength(100000) passage?: string;
  @IsOptional() @IsString() @MaxLength(2000) audioUrl?: string;
  @IsOptional() @IsString() @MaxLength(2000) imageUrl?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(10000) optionA?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(10000) optionB?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(10000) optionC?: string;
  @IsOptional() @IsString() @MaxLength(10000) optionD?: string;
  @IsOptional() @IsIn(['A', 'B', 'C', 'D']) correctAnswer?: string;
  @IsOptional() @IsString() @MaxLength(20000) explanation?: string;
  @IsOptional() @IsEnum(Difficulty) difficulty?: Difficulty;
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  skillIds?: number[];
}
export class SkillDto {
  @IsString() @IsNotEmpty() @MaxLength(100) code: string;
  @IsString() @IsNotEmpty() @MaxLength(300) name: string;
  @IsInt() @Min(1) @Max(7) part: number;
  @IsString() @IsNotEmpty() @MaxLength(200) category: string;
}
export class TheoryDto {
  @IsString() @IsNotEmpty() @MaxLength(500) title: string;
  @IsString() @IsNotEmpty() @MaxLength(150000) content: string;
  @IsInt() @Min(1) @Max(7) part: number;
  @IsInt() @Min(1) skillId: number;
}
export class UserRoleDto {
  @IsEnum(Role) role: Role;
}
export class ResolveReportDto {
  @IsBoolean() resolved: boolean;
}
export class KnowledgeDto {
  @IsInt() @Min(1) @Max(7) part: number;
  @IsOptional() @IsString() @MaxLength(100) skillCode?: string;
  @IsString() @IsNotEmpty() @MaxLength(200) category: string;
  @IsString() @IsNotEmpty() @MaxLength(500) title: string;
  @IsString() @IsNotEmpty() @MaxLength(100000) content: string;
  @IsArray()
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  keywords: string[];
}
export class SystemFlashcardDto {
  @IsString() @IsNotEmpty() @MaxLength(300) word: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) meaning: string;
  @IsOptional() @IsString() @MaxLength(500) phonetic?: string;
  @IsOptional() @IsString() @MaxLength(5000) example?: string;
  @IsOptional() @IsString() @MaxLength(200) topic?: string;
}

