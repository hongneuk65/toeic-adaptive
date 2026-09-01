import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListFlashcardDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(50, { message: 'Mỗi trang tối đa 50 từ vựng' })
    limit?: number = 10;

    @IsOptional()
    @IsString()
    topic?: string;
}