import { HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

export const EMAIL_OTP_POLICY = {
  ttlMinutes: 10,
  resendSeconds: 60,
  maxPerHour: 5,
  maxAttempts: 5,
} as const;

const normalize = (email: string) => email.trim().toLowerCase();

@Injectable()
export class EmailOtpService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly mail: MailService) {}

  get enabled() { return this.mail.enabled; }

  private hash(email: string, code: string) {
    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'jwt-secret-key-toeic-mvp';
    return createHmac('sha256', secret).update(`${email}:${code}`).digest('hex');
  }

  /** Luôn trả cùng một phản hồi dù email đã có tài khoản hay chưa. */
  async request(rawEmail: string, now = new Date()) {
    if (!this.mail.enabled) throw new ServiceUnavailableException('Đăng nhập bằng mã email chưa được bật.');
    const email = normalize(rawEmail);
    const latest = await this.prisma.emailOtp.findFirst({ where: { email }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    const wait = latest ? Math.ceil((latest.createdAt.getTime() + EMAIL_OTP_POLICY.resendSeconds * 1000 - now.getTime()) / 1000) : 0;
    if (wait > 0) throw new HttpException({ message: `Vui lòng chờ ${wait} giây rồi gửi lại mã.`, retryAfterSeconds: wait }, 429);
    const recent = await this.prisma.emailOtp.count({ where: { email, createdAt: { gte: new Date(now.getTime() - 3600_000) } } });
    if (recent >= EMAIL_OTP_POLICY.maxPerHour) throw new HttpException('Đã gửi quá nhiều mã cho email này. Vui lòng thử lại sau một giờ.', 429);

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.emailOtp.updateMany({ where: { email, consumedAt: null }, data: { consumedAt: now } });
    const row = await this.prisma.emailOtp.create({ data: {
      email, codeHash: this.hash(email, code), expiresAt: new Date(now.getTime() + EMAIL_OTP_POLICY.ttlMinutes * 60_000), createdAt: now,
    }, select: { id: true } });
    try {
      await this.mail.sendLoginCode(email, code, EMAIL_OTP_POLICY.ttlMinutes);
    } catch (error) {
      await this.prisma.emailOtp.updateMany({ where: { id: row.id }, data: { consumedAt: now } });
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Chưa gửi được email. Vui lòng thử lại sau.');
    }
    return { sent: true, expiresInSeconds: EMAIL_OTP_POLICY.ttlMinutes * 60, resendAfterSeconds: EMAIL_OTP_POLICY.resendSeconds };
  }

  async verify(rawEmail: string, code: string, now = new Date()) {
    const email = normalize(rawEmail);
    const invalid = 'Mã không đúng hoặc đã hết hạn. Vui lòng gửi lại mã mới.';
    const otp = await this.prisma.emailOtp.findFirst({
      where: { email, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= EMAIL_OTP_POLICY.maxAttempts) throw new UnauthorizedException(invalid);
    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(this.hash(email, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      const attempts = otp.attempts + 1;
      await this.prisma.emailOtp.updateMany({
        where: { id: otp.id, consumedAt: null },
        data: attempts >= EMAIL_OTP_POLICY.maxAttempts ? { attempts, consumedAt: now } : { attempts },
      });
      const left = EMAIL_OTP_POLICY.maxAttempts - attempts;
      throw new UnauthorizedException(left > 0 ? `Mã chưa đúng. Còn ${left} lần thử.` : invalid);
    }
    // Một mã chỉ dùng được một lần, kể cả khi hai yêu cầu đến cùng lúc.
    const claimed = await this.prisma.emailOtp.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: now } });
    if (claimed.count !== 1) throw new UnauthorizedException(invalid);

    let user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) {
      try {
        user = await this.prisma.user.create({ data: { email, passwordHash: `!email-otp-only:${randomBytes(32).toString('hex')}` } });
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error;
        user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (!user) throw new UnauthorizedException(invalid);
      }
    }
    return { accessToken: await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role }) };
  }
}
