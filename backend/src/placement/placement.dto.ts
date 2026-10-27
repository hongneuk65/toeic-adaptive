import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PlacementPreferencesDto {
  @IsIn(['FOUNDATION', 'BALANCED', 'CHALLENGE']) goal!: string;
  @IsOptional() @IsInt() @Min(10) @Max(990) targetScore?: number | null;
}
class PlacementAnswerDto {
  @IsInt() @Min(1) questionId!: number;
  @Matches(/^[ABCD]$/) selectedAnswer!: string;
}
export class SubmitPlacementDto {
  @IsInt() @Min(0) revision!: number;
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => PlacementAnswerDto)
  answers!: PlacementAnswerDto[];
}
