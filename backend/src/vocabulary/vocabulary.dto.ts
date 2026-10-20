import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.normalize('NFKC').trim().replace(/\s+/g, ' ') : value;
export class VocabularyLookupDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120)
  @Matches(/^\S+(?: \S+){0,11}$/, { message: 'Chọn tối đa 12 từ để tra.' }) word: string;
}
export class SaveVocabularyDto extends VocabularyLookupDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(5000) meaning: string;
  @IsOptional() @IsString() @MaxLength(500) phonetic?: string;
  @IsOptional() @IsString() @MaxLength(1800) example?: string;
  @IsOptional() @IsInt() @Min(1) folderId?: number;
  @IsOptional() @IsString() @MaxLength(300) @Matches(/^(?:https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/) source?: string;
}

export class ExplainVocabularyDto extends VocabularyLookupDto {
  @IsOptional() @IsString() @MaxLength(1800) context?: string;
}
