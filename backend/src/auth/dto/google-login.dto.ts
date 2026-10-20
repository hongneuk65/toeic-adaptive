import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GoogleLoginDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  credential: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password?: string;
}
