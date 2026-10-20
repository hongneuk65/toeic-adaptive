import { ConflictException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleLoginDto } from './dto/google-login.dto';

@Injectable()
export class GoogleAuthService {
  private readonly client = new OAuth2Client();
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  get clientId() {
    const value = process.env.GOOGLE_CLIENT_ID?.trim();
    return value && /^[\w.-]+\.apps\.googleusercontent\.com$/.test(value) ? value : null;
  }

  async login(dto: GoogleLoginDto, nonce?: string) {
    const audience = this.clientId;
    if (!audience) throw new ServiceUnavailableException('Đăng nhập Google chưa được bật. Bạn vẫn có thể đăng nhập bằng email.');
    if (!nonce || !/^[a-f0-9]{64}$/.test(nonce)) throw new UnauthorizedException('Phiên đăng nhập Google đã hết hạn. Tải lại trang rồi thử lại.');
    let payload;
    try {
      const ticket = await this.client.verifyIdToken({ idToken: dto.credential, audience });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Không xác minh được tài khoản Google. Vui lòng thử lại.');
    }
    if (!payload?.sub || !payload.email || payload.email_verified !== true || payload.nonce !== nonce) {
      throw new UnauthorizedException('Tài khoản Google hoặc phiên đăng nhập không hợp lệ.');
    }
    const subject = payload.sub;
    let user = await this.prisma.user.findUnique({ where: { googleSubject: subject } });
    if (!user) {
      const email = payload.email.trim().toLowerCase();
      // Existing local emails were never verified. Require the local password to prevent pre-hijacking.
      const existing = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
      if (existing) {
        if (existing.googleSubject || !dto.password) throw new ConflictException('Email này đã có tài khoản. Nhập mật khẩu hiện tại để liên kết Google một lần.');
        if (!await bcrypt.compare(dto.password, existing.passwordHash)) throw new UnauthorizedException('Mật khẩu hiện tại chưa đúng. Vui lòng thử lại.');
        const updated = await this.prisma.user.updateMany({ where: { id: existing.id, googleSubject: null }, data: { googleSubject: subject } });
        if (updated.count !== 1) throw new ConflictException('Tài khoản vừa được cập nhật. Vui lòng đăng nhập Google lại.');
        user = existing;
      } else {
        try {
          user = await this.prisma.user.create({ data: { email, googleSubject: subject, passwordHash: `!google-only:${randomBytes(32).toString('hex')}` } });
        } catch (error) {
          if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
          user = await this.prisma.user.findUnique({ where: { googleSubject: subject } });
          if (!user) throw new ConflictException('Email vừa được đăng ký. Vui lòng thử lại để liên kết tài khoản.');
        }
      }
    }
    return { accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }) };
  }
}
