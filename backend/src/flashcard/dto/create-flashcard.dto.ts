import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFlashcardDto {
    @IsString()
    @IsNotEmpty({ message: 'Từ vựng không được để trống' })
    word: string;

    @IsOptional()
    @IsString()
    phonetic?: string;

    @IsString()
    @IsNotEmpty({ message: 'Nghĩa của từ không được để trống' })
    meaning: string;

    @IsOptional()
    @IsString()
    example?: string;

    @IsString()
    @IsNotEmpty({ message: 'Chủ đề (topic) không được để trống' })
    topic: string;
}