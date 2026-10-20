import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
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
