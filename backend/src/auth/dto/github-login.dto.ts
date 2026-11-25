import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class GithubLoginDto {
  @IsString()
  @Matches(/^[\w-]{1,200}$/)
  code: string;

  @IsString()
  @Matches(/^[a-f0-9]{64}$/)
  state: string;
}

export class GithubLinkDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  linkToken: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}
