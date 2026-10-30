import { IsIn } from 'class-validator';

export class OnboardingDto {
  @IsIn(['ASSESSMENT', 'SELF_STUDY']) choice!: 'ASSESSMENT' | 'SELF_STUDY';
}
