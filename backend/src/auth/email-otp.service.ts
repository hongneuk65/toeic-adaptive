import { HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

export const EMAIL_OTP_POLICY = {
  ttlMinutes: 10,
  resendSeconds: 60,
  maxPerHour: 5,
  maxAttempts: 5,
} as const;

/** REGISTER xác nhận email khi đăng ký; RESET_PASSWORD dùng để đặt lại mật khẩu. */
export type EmailOtpPurpose = 'REGISTER' | 'RESET_PASSWORD';

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export interface IssuedCode { expiresInSeconds: number; resendAfterSeconds: number }

@Injectable()
export class EmailOtpService {
  constructor(private readonly prisma: PrismaService, private readonly mail: MailService) {}

  /** Khi chưa cấu hình gửi email, hệ thống bỏ qua bước xác nhận để vẫn đăng ký được. */
  get enabled() { return this.mail.enabled; }

  private hash(email: string, purpose: EmailOtpPurpose, code: string) {
    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET || 'jwt-secret-key-toeic-mvp';
    return createHmac('sha256', secret).update(`${purpose}:${email}:${code}`).digest('hex');
  }

  /** Tạo mã 6 số, chỉ lưu bản băm, vô hiệu các mã cũ cùng mục đích rồi gửi email. */
  async issue(rawEmail: string, purpose: EmailOtpPurpose, now = new Date()): Promise<IssuedCode> {
    if (!this.mail.enabled) throw new ServiceUnavailableException('Chức năng gửi mã qua email chưa được bật.');
    const email = normalizeEmail(rawEmail);
    const latest = await this.prisma.emailOtp.findFirst({ where: { email, purpose }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
    const wait = latest ? Math.ceil((latest.createdAt.getTime() + EMAIL_OTP_POLICY.resendSeconds * 1000 - now.getTime()) / 1000) : 0;
    if (wait > 0) throw new HttpException({ message: `Vui lòng chờ ${wait} giây rồi gửi lại mã.`, retryAfterSeconds: wait }, 429);
    const recent = await this.prisma.emailOtp.count({ where: { email, purpose, createdAt: { gte: new Date(now.getTime() - 3600_000) } } });
    if (recent >= EMAIL_OTP_POLICY.maxPerHour) throw new HttpException('Đã gửi quá nhiều mã cho email này. Vui lòng thử lại sau một giờ.', 429);

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    await this.prisma.emailOtp.updateMany({ where: { email, purpose, consumedAt: null }, data: { consumedAt: now } });
    const row = await this.prisma.emailOtp.create({ data: {
      email, purpose, codeHash: this.hash(email, purpose, code),
      expiresAt: new Date(now.getTime() + EMAIL_OTP_POLICY.ttlMinutes * 60_000), createdAt: now,
    }, select: { id: true } });
    try {
      await this.mail.sendCode(email, code, EMAIL_OTP_POLICY.ttlMinutes, purpose);
    } catch (error) {
      await this.prisma.emailOtp.updateMany({ where: { id: row.id }, data: { consumedAt: now } });
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Chưa gửi được email. Vui lòng thử lại sau.');
    }
    return { expiresInSeconds: EMAIL_OTP_POLICY.ttlMinutes * 60, resendAfterSeconds: EMAIL_OTP_POLICY.resendSeconds };
  }

  /** Kiểm tra và đánh dấu đã dùng; mỗi mã chỉ dùng được một lần, sai quá 5 lần thì hủy mã. */
  async consume(rawEmail: string, purpose: EmailOtpPurpose, code: string, now = new Date()): Promise<void> {
    const email = normalizeEmail(rawEmail);
    const invalid = 'Mã không đúng hoặc đã hết hạn. Vui lòng gửi lại mã mới.';
    const otp = await this.prisma.emailOtp.findFirst({
      where: { email, purpose, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.attempts >= EMAIL_OTP_POLICY.maxAttempts) throw new UnauthorizedException(invalid);
    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(this.hash(email, purpose, code), 'hex');
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      const attempts = otp.attempts + 1;
      await this.prisma.emailOtp.updateMany({
        where: { id: otp.id, consumedAt: null },
        data: attempts >= EMAIL_OTP_POLICY.maxAttempts ? { attempts, consumedAt: now } : { attempts },
      });
      const left = EMAIL_OTP_POLICY.maxAttempts - attempts;
      throw new UnauthorizedException(left > 0 ? `Mã chưa đúng. Còn ${left} lần thử.` : invalid);
    }
    const claimed = await this.prisma.emailOtp.updateMany({ where: { id: otp.id, consumedAt: null }, data: { consumedAt: now } });
    if (claimed.count !== 1) throw new UnauthorizedException(invalid);
  }
}
