import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

/** Cấu hình SMTP thực sự dùng để gửi mã, chọn từ biến môi trường. */
export interface SmtpSettings { host: string; port: number; secure: boolean; user?: string; pass?: string; fallback: boolean }

/**
 * Dùng SMTP chính khi đủ thông tin. Nếu có SMTP_USER mà thiếu SMTP_PASS (ví dụ bản lấy từ GitHub,
 * không kèm mật khẩu ứng dụng Gmail) và có SMTP_FALLBACK_HOST, mã được gửi vào hộp thư thử nghiệm đó.
 */
export function resolveSmtp(env: NodeJS.ProcessEnv): SmtpSettings | null {
  const host = env.SMTP_HOST?.trim();
  const user = env.SMTP_USER?.trim();
  const pass = env.SMTP_PASS?.replace(/\s+/g, '');
  const fallbackHost = env.SMTP_FALLBACK_HOST?.trim();
  if (host && (!user || pass)) {
    return { host, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true', user: user || undefined, pass: pass || undefined, fallback: false };
  }
  if (fallbackHost) return { host: fallbackHost, port: Number(env.SMTP_FALLBACK_PORT || 1025), secure: false, fallback: true };
  return host ? { host, port: Number(env.SMTP_PORT || 587), secure: env.SMTP_SECURE === 'true', user, fallback: false } : null;
}

/**
 * Gửi email qua SMTP (ví dụ Gmail App Password). Khi chưa cấu hình SMTP, chỉ khi
 * OTP_DEV_LOG=true mới ghi mã ra log của backend để thử trên máy cá nhân.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

  get smtpConfigured() {
    return Boolean(resolveSmtp(process.env) && process.env.SMTP_FROM?.trim());
  }

  get devLog() {
    return process.env.OTP_DEV_LOG === 'true';
  }

  get enabled() {
    return this.smtpConfigured || this.devLog;
  }

  private transport() {
    if (this.transporter) return this.transporter;
    const smtp = resolveSmtp(process.env)!;
    if (smtp.fallback) this.logger.warn(`Thiếu SMTP_PASS cho ${process.env.SMTP_USER}; mã xác nhận được gửi vào hộp thư thử nghiệm ${smtp.host}:${smtp.port}.`);
    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user && smtp.pass ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
    return this.transporter;
  }

  async sendCode(email: string, code: string, minutes: number, purpose: 'REGISTER' | 'RESET_PASSWORD') {
    const action = purpose === 'REGISTER' ? 'xác nhận email đăng ký' : 'đặt lại mật khẩu';
    if (this.smtpConfigured) {
      await this.transport().sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: `Mã ${action} TOEIC Adaptive: ${code}`,
        text: `Mã ${action} của bạn là ${code}. Mã có hiệu lực trong ${minutes} phút và chỉ dùng được một lần.\n\nNếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.`,
        html: `<p>Mã ${action} TOEIC Adaptive của bạn:</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p>Mã có hiệu lực trong ${minutes} phút và chỉ dùng được một lần.</p><p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email.</p>`,
      });
      return;
    }
    if (this.devLog) {
      this.logger.warn(`[OTP_DEV_LOG] Mã ${action} cho ${email}: ${code} (chỉ dùng khi thử trên máy cá nhân)`);
      return;
    }
    throw new ServiceUnavailableException('Chức năng gửi mã qua email chưa được bật.');
  }
}
