import { jest } from '@jest/globals';
import { ConflictException, ForbiddenException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { EmailOtpService } from './email-otp.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService registration with email verification', () => {
  const db = { user: { findFirst: jest.fn<any>(), create: jest.fn<any>(), update: jest.fn<any>() } };
  const jwt = { signAsync: jest.fn<any>() };
  const otp = { enabled: true, issue: jest.fn<any>(), consume: jest.fn<any>() };
  const service = new AuthService(db as unknown as PrismaService, jwt as unknown as JwtService, otp as unknown as EmailOtpService);

  beforeEach(() => {
    jest.resetAllMocks();
    otp.enabled = true;
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue({ id: 3 });
    db.user.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, email: 'new@example.com', role: 'USER', ...data }));
    otp.issue.mockResolvedValue({ expiresInSeconds: 600, resendAfterSeconds: 60 });
    otp.consume.mockResolvedValue(undefined);
    jwt.signAsync.mockResolvedValue('token');
  });

  it('creates an unverified account and sends a registration code', async () => {
    const result = await service.register({ email: ' New@Example.com ', password: 'secret1' });
    expect(result).toEqual({ email: 'new@example.com', verificationRequired: true, expiresInSeconds: 600, resendAfterSeconds: 60 });
    const data = db.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ email: 'new@example.com', emailVerifiedAt: null });
    expect(await bcrypt.compare('secret1', data.passwordHash)).toBe(true);
    expect(otp.issue).toHaveBeenCalledWith('new@example.com', 'REGISTER');
  });

  it('rejects a verified email but lets the mailbox owner re-register an unverified one', async () => {
    db.user.findFirst.mockResolvedValue({ id: 2, emailVerifiedAt: new Date() });
    await expect(service.register({ email: 'a@b.co', password: 'secret1' })).rejects.toBeInstanceOf(ConflictException);
    db.user.findFirst.mockResolvedValue({ id: 2, emailVerifiedAt: null });
    await service.register({ email: 'a@b.co', password: 'secret2' });
    expect(db.user.update.mock.calls[0][0].where).toEqual({ id: 2 });
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('keeps the account when the email cannot be sent so the learner can resend', async () => {
    otp.issue.mockRejectedValue(new ServiceUnavailableException('Chưa gửi được email. Vui lòng thử lại sau.'));
    const result = await service.register({ email: 'a@b.co', password: 'secret1' });
    expect(result).toMatchObject({ verificationRequired: true, sendError: 'Chưa gửi được email. Vui lòng thử lại sau.' });
    expect(db.user.create).toHaveBeenCalled();
  });

  it('skips verification when the server cannot send email', async () => {
    otp.enabled = false;
    expect(await service.register({ email: 'a@b.co', password: 'secret1' })).toEqual({ email: 'a@b.co', verificationRequired: false });
    expect(db.user.create.mock.calls[0][0].data.emailVerifiedAt).toBeInstanceOf(Date);
    expect(otp.issue).not.toHaveBeenCalled();
  });

  it('verifies the code, marks the email verified and signs the learner in', async () => {
    db.user.findFirst.mockResolvedValue({ id: 4, email: 'a@b.co', role: 'USER', emailVerifiedAt: null });
    expect(await service.verifyRegistration('A@B.co', '123456')).toEqual({ accessToken: 'token' });
    expect(otp.consume).toHaveBeenCalledWith('a@b.co', 'REGISTER', '123456');
    expect(db.user.update.mock.calls[0][0].data.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it('never issues a token through registration verification for an already verified account', async () => {
    db.user.findFirst.mockResolvedValue({ id: 4, email: 'a@b.co', role: 'USER', emailVerifiedAt: new Date() });
    for (const code of ['000000', '123456']) {
      await expect(service.verifyRegistration('a@b.co', code)).rejects.toBeInstanceOf(UnauthorizedException);
    }
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('rejects invalid registration codes without updating the account or issuing a token', async () => {
    db.user.findFirst.mockResolvedValue({ id: 4, email: 'a@b.co', role: 'USER', emailVerifiedAt: null });
    otp.consume.mockRejectedValue(new UnauthorizedException('Invalid code'));
    await expect(service.verifyRegistration('a@b.co', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('blocks password login until the email is verified', async () => {
    const passwordHash = await bcrypt.hash('secret1', 4);
    db.user.findFirst.mockResolvedValue({ id: 5, email: 'a@b.co', role: 'USER', passwordHash, emailVerifiedAt: null });
    await expect(service.login({ email: 'a@b.co', password: 'secret1' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.login({ email: 'a@b.co', password: 'wrong11' })).rejects.toBeInstanceOf(UnauthorizedException);
    db.user.findFirst.mockResolvedValue({ id: 5, email: 'a@b.co', role: 'USER', passwordHash, emailVerifiedAt: new Date() });
    expect(await service.login({ email: ' A@B.co', password: 'secret1' })).toEqual({ accessToken: 'token' });
  });

  it('resets the password with a reset code and does not reveal unknown emails', async () => {
    expect(await service.forgotPassword('nobody@b.co')).toEqual({ expiresInSeconds: 600, resendAfterSeconds: 60 });
    expect(otp.issue).not.toHaveBeenCalled();
    db.user.findFirst.mockResolvedValue({ id: 6, email: 'a@b.co', role: 'USER', emailVerifiedAt: null });
    await service.forgotPassword('a@b.co');
    expect(otp.issue).toHaveBeenCalledWith('a@b.co', 'RESET_PASSWORD');
    expect(await service.resetPassword('a@b.co', '654321', 'newpass1')).toEqual({ accessToken: 'token' });
    expect(otp.consume).toHaveBeenCalledWith('a@b.co', 'RESET_PASSWORD', '654321');
    const data = db.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('newpass1', data.passwordHash)).toBe(true);
    expect(data.emailVerifiedAt).toBeInstanceOf(Date);
  });
});
