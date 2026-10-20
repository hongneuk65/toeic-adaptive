import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { GoogleAuthService } from './google-auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { RequestBudgetGuard } from '../common/request-budget.guard';

@Controller('auth/google')
export class GoogleAuthController {
  constructor(private readonly google: GoogleAuthService) {}
  private get cookieName() { return process.env.NODE_ENV === 'production' ? '__Host-toeic_google_nonce' : 'toeic_google_nonce'; }
  private get cookieOptions() { return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/', maxAge: 600000 }; }

  @Get('config')
  config(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const clientId = this.google.clientId;
    if (!clientId) return { enabled: false };
    const nonce = randomBytes(32).toString('hex');
    response.cookie(this.cookieName, nonce, this.cookieOptions);
    return { enabled: true, clientId, nonce };
  }

  @Post()
  @UseGuards(RequestBudgetGuard)
  async login(@Body() dto: GoogleLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const nonce = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${this.cookieName}=`))?.slice(this.cookieName.length + 1);
    const result = await this.google.login(dto, nonce);
    response.clearCookie(this.cookieName, this.cookieOptions);
    return result;
  }
}
