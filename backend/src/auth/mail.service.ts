import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/**
 * Gửi email qua SMTP (ví dụ Gmail App Password). Khi chưa cấu hình SMTP, chỉ khi
 * OTP_DEV_LOG=true mới ghi mã ra log của backend để thử trên máy cá nhân.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  get smtpConfigured() {
    return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_FROM?.trim());
  }

  get devLog() {
    return process.env.OTP_DEV_LOG === 'true';
  }

  get enabled() {
    return this.smtpConfigured || this.devLog;
  }

  private transport() {
    this.transporter ??= nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
    return this.transporter;
  }

  async sendLoginCode(email: string, code: string, minutes: number) {
    if (this.smtpConfigured) {
      await this.transport().sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `Mã đăng nhập TOEIC Adaptive: ${code}`,
        text: `Mã đăng nhập của bạn là ${code}. Mã có hiệu lực trong ${minutes} phút và chỉ dùng được một lần.\n\nNếu bạn không yêu cầu mã này, hãy bỏ qua email.`,
        html: `<p>Mã đăng nhập TOEIC Adaptive của bạn:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Mã có hiệu lực trong ${minutes} phút và chỉ dùng được một lần.</p><p>Nếu bạn không yêu cầu mã này, hãy bỏ qua email.</p>`,
      });
      return;
    }
    if (this.devLog) {
      this.logger.warn(`[OTP_DEV_LOG] Mã đăng nhập cho ${email}: ${code} (chỉ dùng khi thử trên máy cá nhân)`);
      return;
    }
    throw new ServiceUnavailableException('Đăng nhập bằng mã email chưa được bật.');
  }
}
