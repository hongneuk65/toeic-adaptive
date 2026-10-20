import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CreateFolderDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(1000) description?: string;
}
export class CreateFlashcardDto {
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(200) word: string;
  @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(1500) meaning: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(300) phonetic?: string;
  @IsOptional() @Transform(trim) @IsString() @MaxLength(3000) example?: string;
}
