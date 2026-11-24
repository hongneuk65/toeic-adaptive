import { IsEmail, Matches, MaxLength } from 'class-validator';

export class RequestEmailOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email: string;
}

export class VerifyEmailOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email: string;

  @Matches(/^\d{6}$/, { message: 'Mã gồm 6 chữ số' })
  code: string;
}
