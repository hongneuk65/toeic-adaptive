import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { OnboardingDto } from './dto/onboarding.dto';
import { RequestBudgetGuard } from '../common/request-budget.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
}
