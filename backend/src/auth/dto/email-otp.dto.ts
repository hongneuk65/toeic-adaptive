import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class EmailOnlyDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @MaxLength(254)
  email: string;
}

export class VerifyEmailCodeDto extends EmailOnlyDto {
  @Matches(/^\d{6}$/, { message: 'Mã gồm 6 chữ số' })
  code: string;
}

export class ResetPasswordDto extends VerifyEmailCodeDto {
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  @MaxLength(72)
  @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
  password: string;
}
