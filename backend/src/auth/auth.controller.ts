import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { RequestBudgetGuard } from '../common/request-budget.guard';
import { EmailOtpService } from './email-otp.service';
import { EmailOnlyDto, ResetPasswordDto, VerifyEmailCodeDto } from './dto/email-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private emailOtp: EmailOtpService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  me(@Req() request: { user: { id: number; email: string; role: string } }) {
    const { id, email, role } = request.user;
    return { id, email, role };
  }

  @Get('learning-status')
  @UseGuards(AuthGuard('jwt'))
  learningStatus(@Req() request: { user: { id: number } }) {
    return this.authService.learningStatus(request.user.id);
  }

  @Post('onboarding')
  @UseGuards(AuthGuard('jwt'))
  onboarding(@Req() request: { user: { id: number } }, @Body() dto: OnboardingDto) {
    return this.authService.chooseOnboarding(request.user.id, dto.choice);
  }

  @Post('register')
  @UseGuards(RequestBudgetGuard)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(RequestBudgetGuard)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /** enabled=false nghĩa là máy chủ chưa gửi được email: đăng ký không cần bước nhập mã. */
  @Get('otp/config')
  otpConfig() {
    return { enabled: this.emailOtp.enabled };
  }

  @Post('register/verify')
  @UseGuards(RequestBudgetGuard)
  verifyRegistration(@Body() dto: VerifyEmailCodeDto) {
    return this.authService.verifyRegistration(dto.email, dto.code);
  }

  @Post('register/resend')
  @UseGuards(RequestBudgetGuard)
  resendRegistration(@Body() dto: EmailOnlyDto) {
    return this.authService.resendRegistration(dto.email);
  }

  @Post('password/forgot')
  @UseGuards(RequestBudgetGuard)
  forgotPassword(@Body() dto: EmailOnlyDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('password/reset')
  @UseGuards(RequestBudgetGuard)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.email, dto.code, dto.password);
  }
}
