import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { RequestBudgetGuard } from '../common/request-budget.guard';
import { EmailOtpService } from './email-otp.service';
import { RequestEmailOtpDto, VerifyEmailOtpDto } from './dto/email-otp.dto';

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

  @Get('otp/config')
  otpConfig() {
    return { enabled: this.emailOtp.enabled };
  }

  @Post('otp/request')
  @UseGuards(RequestBudgetGuard)
  requestOtp(@Body() dto: RequestEmailOtpDto) {
    return this.emailOtp.request(dto.email);
  }

  @Post('otp/verify')
  @UseGuards(RequestBudgetGuard)
  verifyOtp(@Body() dto: VerifyEmailOtpDto) {
    return this.emailOtp.verify(dto.email, dto.code);
  }
}
