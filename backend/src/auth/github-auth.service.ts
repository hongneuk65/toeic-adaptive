import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

interface GithubProfile { githubId: string; email: string }
type LoginResult = { accessToken: string } | { linkRequired: true; email: string; linkToken: string; hasPassword: boolean };

/**
 * Đăng nhập GitHub theo OAuth (đổi code ở backend, client secret không rời máy chủ).
 * Tài khoản nhận diện bằng id GitHub cố định; chỉ dùng email chính đã xác minh.
 * Email trùng tài khoản cũ phải nhập mật khẩu hiện tại một lần để liên kết, tránh chiếm tài khoản.
 */
@Injectable()
export class GithubAuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  /** Có thể thay trong kiểm thử. */
  protected http(url: string, init: RequestInit) { return fetch(url, { ...init, signal: AbortSignal.timeout(10000) }); }

  get config() {
    const clientId = process.env.GITHUB_CLIENT_ID?.trim();
    const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
    if (!clientId || !/^[\w.-]{10,100}$/.test(clientId) || !clientSecret || clientSecret.length < 20) return null;
    const frontend = (process.env.FRONTEND_URL || 'http://localhost:8080').trim().replace(/\/$/, '');
    const redirectUri = process.env.GITHUB_REDIRECT_URI?.trim() || `${frontend}/login/github`;
    return { clientId, clientSecret, redirectUri };
  }

  authorizeUrl(state: string) {
    const config = this.config;
    if (!config) return null;
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, scope: 'read:user user:email', state, allow_signup: 'true' }).toString();
    return url.toString();
  }

  async login(code: string, state: string, expectedState?: string): Promise<LoginResult> {
    const config = this.config;
    if (!config) throw new ServiceUnavailableException('Đăng nhập GitHub chưa được bật. Bạn vẫn có thể đăng nhập bằng email.');
    if (!expectedState || expectedState.length !== state.length || !timingSafeEqual(Buffer.from(expectedState), Buffer.from(state))) {
      throw new UnauthorizedException('Phiên đăng nhập GitHub đã hết hạn. Vui lòng thử lại.');
    }
    const profile = await this.profile(await this.exchange(code, config));
    return this.resolve(profile);
  }

  private async exchange(code: string, config: NonNullable<GithubAuthService['config']>) {
    let data: { access_token?: unknown; error?: unknown };
    try {
      const response = await this.http('https://github.com/login/oauth/access_token', {
        method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: config.redirectUri }),
      });
      data = await response.json() as typeof data;
    } catch {
      throw new ServiceUnavailableException('Chưa kết nối được GitHub. Vui lòng thử lại.');
    }
    if (typeof data.access_token !== 'string' || !data.access_token) throw new UnauthorizedException('Mã đăng nhập GitHub không hợp lệ hoặc đã dùng. Vui lòng thử lại.');
    return data.access_token;
  }

  private async profile(token: string): Promise<GithubProfile> {
    const headers = { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'toeic-adaptive', 'X-GitHub-Api-Version': '2022-11-28' };
    let user: { id?: unknown }; let emails: unknown;
    try {
      const [userResponse, emailResponse] = await Promise.all([this.http('https://api.github.com/user', { headers }), this.http('https://api.github.com/user/emails', { headers })]);
      if (!userResponse.ok || !emailResponse.ok) throw new Error('github');
      user = await userResponse.json() as typeof user; emails = await emailResponse.json();
    } catch {
      throw new ServiceUnavailableException('Chưa đọc được tài khoản GitHub. Vui lòng thử lại.');
    }
    if (typeof user.id !== 'number' && typeof user.id !== 'string') throw new UnauthorizedException('Tài khoản GitHub không hợp lệ.');
    const list = Array.isArray(emails) ? emails as Array<{ email?: unknown; primary?: unknown; verified?: unknown }> : [];
    const verified = list.filter(e => e.verified === true && typeof e.email === 'string' && !/noreply\.github\.com$/i.test(e.email));
    const chosen = verified.find(e => e.primary === true) ?? verified[0];
    if (!chosen) throw new UnauthorizedException('Tài khoản GitHub chưa có email đã xác minh. Thêm email trong GitHub rồi thử lại.');
    return { githubId: String(user.id), email: (chosen.email as string).trim().toLowerCase() };
  }

  async resolve({ githubId, email }: GithubProfile): Promise<LoginResult> {
    let user = await this.prisma.user.findUnique({ where: { githubId } });
    if (!user) {
      const existing = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
      if (existing) {
        if (existing.githubId) throw new ConflictException('Email này đã liên kết với một tài khoản GitHub khác.');
        const linkToken = await this.jwt.signAsync({ purpose: 'github-link', uid: existing.id, githubId }, { expiresIn: '10m' });
        return { linkRequired: true, email: existing.email, linkToken, hasPassword: !existing.passwordHash.startsWith('!') };
      }
      try {
        user = await this.prisma.user.create({ data: { email, githubId, emailVerifiedAt: new Date(), passwordHash: `!github-only:${randomBytes(32).toString('hex')}` } });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        user = await this.prisma.user.findUnique({ where: { githubId } });
        if (!user) throw new ConflictException('Email vừa được đăng ký. Vui lòng thử lại để liên kết tài khoản.');
      }
    }
    return { accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }) };
  }

  async link(linkToken: string, password: string) {
    let payload: { purpose?: unknown; uid?: unknown; githubId?: unknown };
    try { payload = await this.jwt.verifyAsync(linkToken); } catch { throw new UnauthorizedException('Yêu cầu liên kết đã hết hạn. Vui lòng đăng nhập GitHub lại.'); }
    if (payload.purpose !== 'github-link' || typeof payload.uid !== 'number' || typeof payload.githubId !== 'string') throw new UnauthorizedException('Yêu cầu liên kết không hợp lệ.');
    const user = await this.prisma.user.findUnique({ where: { id: payload.uid } });
    if (!user) throw new UnauthorizedException('Yêu cầu liên kết không hợp lệ.');
    if (user.passwordHash.startsWith('!')) throw new BadRequestException('Tài khoản này chưa có mật khẩu. Hãy đăng nhập bằng Google hoặc mã gửi qua email.');
    if (!await bcrypt.compare(password, user.passwordHash)) throw new UnauthorizedException('Mật khẩu hiện tại chưa đúng. Vui lòng thử lại.');
    const updated = await this.prisma.user.updateMany({ where: { id: user.id, githubId: null }, data: { githubId: payload.githubId } });
    if (updated.count !== 1) throw new ConflictException('Tài khoản vừa được cập nhật. Vui lòng đăng nhập GitHub lại.');
    return { accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }) };
  }
}
