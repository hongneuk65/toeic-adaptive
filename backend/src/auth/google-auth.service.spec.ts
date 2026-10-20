import { ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { OAuth2Client } from 'google-auth-library';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GoogleAuthService } from './google-auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Google sign-in identity and account linking', () => {
  const nonce = 'a'.repeat(64);
  const originalClient = process.env.GOOGLE_CLIENT_ID;
  const clientId = '123-test.apps.googleusercontent.com';
  const user = { id: 42, email: 'learner@gmail.com', role: Role.USER, googleSubject: null, passwordHash: '' };
  const db = { user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), updateMany: jest.fn() } };
  const signAsync = jest.fn().mockResolvedValue('app-session');
  let service: GoogleAuthService;
  let verify: ReturnType<typeof jest.spyOn>;
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = clientId;
    db.user.findUnique.mockResolvedValue(null); db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockResolvedValue(user); db.user.updateMany.mockResolvedValue({ count: 1 });
    verify = jest.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockResolvedValue({ getPayload: () => ({ sub: 'stable-google-subject', email: 'Learner@gmail.com', email_verified: true, nonce }) } as never);
    service = new GoogleAuthService(db as unknown as PrismaService, { signAsync } as unknown as JwtService);
  });
  afterEach(() => { jest.restoreAllMocks(); if (originalClient === undefined) delete process.env.GOOGLE_CLIENT_ID; else process.env.GOOGLE_CLIENT_ID = originalClient; });

  it('fails closed when Google is not configured', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    expect(service.clientId).toBeNull();
    await expect(service.login({ credential: 'token' }, nonce)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(verify).not.toHaveBeenCalled();
  });
  it('requires a browser-bound nonce before token verification', async () => {
    await expect(service.login({ credential: 'token' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled(); expect(db.user.create).not.toHaveBeenCalled();
  });
  it('verifies Google signature/expiry/audience through the official library', async () => {
    verify.mockRejectedValue(new Error('bad signature, audience or expiry') as never);
    await expect(service.login({ credential: 'untrusted' }, nonce)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).toHaveBeenCalledWith({ idToken: 'untrusted', audience: clientId });
    expect(signAsync).not.toHaveBeenCalled();
  });
  it.each([{ sub: 'g', email: 'a@gmail.com', email_verified: false, nonce }, { sub: 'g', email: 'a@gmail.com', email_verified: true, nonce: 'different' }, { email: 'a@gmail.com', email_verified: true, nonce }])('rejects unverified email, mismatched nonce or absent subject: %p', async payload => {
    verify.mockResolvedValue({ getPayload: () => payload } as never);
    await expect(service.login({ credential: 'token' }, nonce)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.user.findUnique).not.toHaveBeenCalled();
  });
  it('creates a learner with a non-password sentinel and returns the existing app JWT format', async () => {
    expect(await service.login({ credential: 'token' }, nonce)).toEqual({ accessToken: 'app-session' });
    expect(db.user.create).toHaveBeenCalledWith({ data: { email: 'learner@gmail.com', googleSubject: 'stable-google-subject', passwordHash: expect.stringMatching(/^!google-only:/) } });
    expect(signAsync).toHaveBeenCalledWith({ sub: 42, email: user.email, role: Role.USER });
  });
  it('uses stable Google subject instead of merging a changed email into another user', async () => {
    db.user.findUnique.mockResolvedValue(user);
    await service.login({ credential: 'token' }, nonce);
    expect(db.user.findFirst).not.toHaveBeenCalled(); expect(db.user.create).not.toHaveBeenCalled();
  });
  it('never automatically links an unverified local account with the same email', async () => {
    db.user.findFirst.mockResolvedValue(user);
    await expect(service.login({ credential: 'token' }, nonce)).rejects.toBeInstanceOf(ConflictException);
    expect(db.user.updateMany).not.toHaveBeenCalled(); expect(signAsync).not.toHaveBeenCalled();
  });
  it('requires the correct local password then preserves user ID and role', async () => {
    db.user.findFirst.mockResolvedValue({ ...user, passwordHash: await bcrypt.hash('local-password', 4) });
    await expect(service.login({ credential: 'token', password: 'wrong' }, nonce)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.user.updateMany).not.toHaveBeenCalled();
    await service.login({ credential: 'token', password: 'local-password' }, nonce);
    expect(db.user.updateMany).toHaveBeenCalledWith({ where: { id: 42, googleSubject: null }, data: { googleSubject: 'stable-google-subject' } });
    expect(signAsync).toHaveBeenCalledWith({ sub: 42, email: user.email, role: Role.USER });
  });
  it('recovers a simultaneous Google signup without creating two learner identities', async () => {
    db.user.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(user);
    db.user.create.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));
    expect(await service.login({ credential: 'token' }, nonce)).toEqual({ accessToken: 'app-session' });
  });
});
