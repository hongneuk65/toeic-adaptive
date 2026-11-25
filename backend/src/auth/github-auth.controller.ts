import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { GithubAuthService } from './github-auth.service';
import { GithubLinkDto, GithubLoginDto } from './dto/github-login.dto';
import { RequestBudgetGuard } from '../common/request-budget.guard';

@Controller('auth/github')
export class GithubAuthController {
  constructor(private readonly github: GithubAuthService) {}
  private get cookieName() { return process.env.NODE_ENV === 'production' ? '__Host-toeic_github_state' : 'toeic_github_state'; }
  // Lax: GitHub đưa người dùng quay lại bằng một điều hướng từ trang khác.
  private get cookieOptions() { return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/', maxAge: 600000 }; }

  @Get('config')
  config(@Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    if (!this.github.config) return { enabled: false };
    const state = randomBytes(32).toString('hex');
    response.cookie(this.cookieName, state, this.cookieOptions);
    return { enabled: true, authorizeUrl: this.github.authorizeUrl(state) };
  }

  @Post()
  @UseGuards(RequestBudgetGuard)
  async login(@Body() dto: GithubLoginDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    const expected = request.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${this.cookieName}=`))?.slice(this.cookieName.length + 1);
    response.clearCookie(this.cookieName, this.cookieOptions);
    return this.github.login(dto.code, dto.state, expected);
  }

  @Post('link')
  @UseGuards(RequestBudgetGuard)
  link(@Body() dto: GithubLinkDto, @Res({ passthrough: true }) response: Response) {
    response.setHeader('Cache-Control', 'no-store');
    return this.github.link(dto.linkToken, dto.password);
  }
}
