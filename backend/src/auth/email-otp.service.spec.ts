import { jest } from '@jest/globals';
import { HttpException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EmailOtpService } from './email-otp.service';
import { MailService } from './mail.service';
import { PrismaService } from '../prisma/prisma.service';

describe('email OTP login', () => {
  const now = new Date('2026-11-25T08:00:00Z');
  const db = {
    emailOtp: { findFirst: jest.fn<any>(), count: jest.fn<any>(), updateMany: jest.fn<any>(), create: jest.fn<any>() },
    user: { findFirst: jest.fn<any>(), create: jest.fn<any>() },
  };
  const jwt = { signAsync: jest.fn<any>() };
  const mail = { enabled: true, sendLoginCode: jest.fn<any>() };
  const service = new EmailOtpService(db as unknown as PrismaService, jwt as unknown as JwtService, mail as unknown as MailService);
  let sentCode = '';

  beforeEach(() => {
    jest.resetAllMocks();
    mail.enabled = true;
    db.emailOtp.findFirst.mockResolvedValue(null);
    db.emailOtp.count.mockResolvedValue(0);
    db.emailOtp.updateMany.mockResolvedValue({ count: 1 });
    db.emailOtp.create.mockResolvedValue({ id: 1 });
    mail.sendLoginCode.mockImplementation(async (_e: any, code: any) => { sentCode = code; });
    jwt.signAsync.mockResolvedValue('token');
  });

  async function issued() {
    await service.request('  Learner@Example.com ', now);
    return { code: sentCode, row: db.emailOtp.create.mock.calls[0][0].data };
  }

  it('sends a 6-digit code, stores only its hash and invalidates older codes', async () => {
    const result = await service.request('Learner@Example.com', now);
    expect(result).toEqual({ sent: true, expiresInSeconds: 600, resendAfterSeconds: 60 });
    expect(sentCode).toMatch(/^\d{6}$/);
    const data = db.emailOtp.create.mock.calls[0][0].data;
    expect(data.email).toBe('learner@example.com');
    expect(data.codeHash).not.toContain(sentCode);
    expect(data.expiresAt.getTime() - now.getTime()).toBe(600_000);
    expect(db.emailOtp.updateMany).toHaveBeenCalledWith({ where: { email: 'learner@example.com', consumedAt: null }, data: { consumedAt: now } });
  });

  it('enforces the resend cooldown and the hourly cap', async () => {
    db.emailOtp.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 20_000) });
    await expect(service.request('a@b.co', now)).rejects.toMatchObject({ status: 429 });
    db.emailOtp.findFirst.mockResolvedValue({ createdAt: new Date(now.getTime() - 120_000) });
    db.emailOtp.count.mockResolvedValue(5);
    await expect(service.request('a@b.co', now)).rejects.toBeInstanceOf(HttpException);
    expect(db.emailOtp.create).not.toHaveBeenCalled();
  });

  it('refuses when no mail transport is configured and voids a code that could not be sent', async () => {
    mail.enabled = false;
    await expect(service.request('a@b.co', now)).rejects.toBeInstanceOf(ServiceUnavailableException);
    mail.enabled = true;
    mail.sendLoginCode.mockRejectedValue(new Error('smtp down'));
    await expect(service.request('a@b.co', now)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.emailOtp.updateMany).toHaveBeenLastCalledWith({ where: { id: 1 }, data: { consumedAt: now } });
  });

  it('logs in an existing account with the right code exactly once', async () => {
    const { code, row } = await issued();
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 0, consumedAt: null });
    db.user.findFirst.mockResolvedValue({ id: 7, email: 'learner@example.com', role: 'USER' });
    expect(await service.verify('LEARNER@example.com', code, now)).toEqual({ accessToken: 'token' });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: 7, email: 'learner@example.com', role: 'USER' });
    expect(db.user.create).not.toHaveBeenCalled();
    db.emailOtp.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.verify('learner@example.com', code, now)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates a passwordless learner for a new email', async () => {
    const { code, row } = await issued();
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 0, consumedAt: null });
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: 9, email: 'learner@example.com', role: 'USER' });
    await service.verify('learner@example.com', code, now);
    expect(db.user.create.mock.calls[0][0].data.passwordHash).toMatch(/^!email-otp-only:/);
  });

  it('counts wrong codes and burns the code after five attempts', async () => {
    const { code, row } = await issued();
    const wrong = code === '000000' ? '111111' : '000000';
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 3, consumedAt: null });
    await expect(service.verify('learner@example.com', wrong, now)).rejects.toThrow('Còn 1 lần thử');
    expect(db.emailOtp.updateMany).toHaveBeenLastCalledWith({ where: { id: 1, consumedAt: null }, data: { attempts: 4 } });
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 4, consumedAt: null });
    await expect(service.verify('learner@example.com', wrong, now)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.emailOtp.updateMany).toHaveBeenLastCalledWith({ where: { id: 1, consumedAt: null }, data: { attempts: 5, consumedAt: now } });
    db.emailOtp.findFirst.mockResolvedValue({ id: 1, ...row, attempts: 5, consumedAt: null });
    await expect(service.verify('learner@example.com', code, now)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects when there is no live code', async () => {
    await expect(service.verify('learner@example.com', '123456', now)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.emailOtp.findFirst.mock.calls[0][0].where).toMatchObject({ email: 'learner@example.com', consumedAt: null, expiresAt: { gt: now } });
  });
});
