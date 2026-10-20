import { IsEmail, IsNotEmpty, MinLength, IsString, MaxLength } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @MaxLength(254)
    email: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @IsString()
    @MaxLength(72)
    @MinLength(6, { message: 'Mật khẩu phải từ 6 ký tự trở lên' })
    password: string;
}
