import { jest } from '@jest/globals';
import { HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { EmailOtpService } from './email-otp.service';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';

describe('email verification codes', () => {
  const now = new Date('2026-11-25T08:00:00Z');
  const db = {
    emailOtp: { findFirst: jest.fn<any>(), count: jest.fn<any>(), updateMany: jest.fn<any>(), create: jest.fn<any>() },
  };
  const mail = { enabled: true, sendCode: jest.fn<any>() };
  const service = new EmailOtpService(db as unknown as PrismaService, mail as unknown as MailService);
  let sentCode = '';

  beforeEach(() => {
    jest.resetAllMocks();
    mail.enabled = true;
    db.emailOtp.findFirst.mockResolvedValue(null);
    db.emailOtp.count.mockResolvedValue(0);
    db.emailOtp.updateMany.mockResolvedValue({ count: 1 });
    db.emailOtp.create.mockResolvedValue({ id: 1 });
    mail.sendCode.mockImplementation(async (_e: any, code: any) => { sentCode = code; });
  });

  async function issued(purpose: 'REGISTER' | 'RESET_PASSWORD' = 'REGISTER') {
    await service.issue('  Learner@Example.com ', purpose, now);
    return { code: sentCode, row: db.emailOtp.create.mock.calls[0][0].data };
  }

  it('sends a 6-digit code, stores only its hash and invalidates older codes of the same purpose', async () => {
    const result = await service.issue('Learner@Example.com', 'REGISTER', now);
    expect(result).toEqual({ expiresInSeconds: 600, resendAfterSeconds: 60 });
    expect(sentCode).toMatch(/^\d{6}$/);
    expect(mail.sendCode).toHaveBeenCalledWith('learner@example.com', sentCode, 10, 'REGISTER');
    const data = db.emailOtp.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: 'learner@example.com', purpose: 'REGISTER' });
    expect(data.codeHash).not.toContain(sentCode);
    expect(data.expiresAt.getTime() - now.getTime()).toBe(600_000);
    expect(db.emailOtp.updateMany).toHaveBeenCalledWith({ where: { email: 'learner@example.com', purpose: 'REGISTER', consumedAt: null }, data: { consumedAt: now } });
  });

  it('enforces the resend cooldown and the hourly cap', async () => {
    db.emailOtp.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 20_000) });
    await expect(service.issue('a@b.co', 'REGISTER', now)).rejects.toMatchObject({ status: 429 });
    db.emailOtp.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 120_000) });
    db.emailOtp.count.mockResolvedValue(5);
    await expect(service.issue('a@b.co', 'REGISTER', now)).rejects.toBeInstanceOf(HttpException);
    expect(db.emailOtp.create).not.toHaveBeenCalled();
  });

  it('refuses when no mail transport is configured and voids a code that could not be sent', async () => {
    mail.enabled = false;
    await expect(service.issue('a@b.co', 'REGISTER', now)).rejects.toBeInstanceOf(ServiceUnavailableException);
    mail.enabled = true;
    mail.sendCode.mockRejectedValue(new Error('smtp down'));
    await expect(service.issue('a@b.co', 'REGISTER', now)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.emailOtp.updateMany).toHaveBeenLastCalledWith({ where: { id: 1 }, data: { consumedAt: now } });
  });

  it('accepts the right code exactly once', async () => {
    const { code, row } = await issued();
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 0, consumedAt: null });
    await expect(service.consume('LEARNER@example.com', 'REGISTER', code, now)).resolves.toBeUndefined();
    db.emailOtp.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.consume('learner@example.com', 'REGISTER', code, now)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not accept a registration code for a password reset', async () => {
    const { code, row } = await issued('REGISTER');
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, purpose: 'RESET_PASSWORD', attempts: 0, consumedAt: null });
    await expect(service.consume('learner@example.com', 'RESET_PASSWORD', code, now)).rejects.toThrow('Còn 4 lần thử');
  });

  it('counts wrong codes and burns the code after five attempts', async () => {
    const { code, row } = await issued();
    const wrong = code === '000000' ? '111111' : '000000';
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 3, consumedAt: null });
    await expect(service.consume('learner@example.com', 'REGISTER', wrong, now)).rejects.toThrow('Còn 1 lần thử');
    expect(db.emailOtp.updateMany).toHaveBeenLastCalledWith({ where: { id: 1, consumedAt: null }, data: { attempts: 4 } });
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 4, consumedAt: null });
    await expect(service.consume('learner@example.com', 'REGISTER', wrong, now)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.emailOtp.updateMany).toHaveBeenLastCalledWith({ where: { id: 1, consumedAt: null }, data: { attempts: 5, consumedAt: now } });
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 5, consumedAt: null });
    await expect(service.consume('learner@example.com', 'REGISTER', code, now)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when there is no live code', async () => {
    await expect(service.consume('learner@example.com', 'REGISTER', '123456', now)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.emailOtp.findFirst.mock.calls[0][0].where).toMatchObject({ email: 'learner@example.com', purpose: 'REGISTER', consumedAt: null, expiresAt: { gt: now } });
  });
});
