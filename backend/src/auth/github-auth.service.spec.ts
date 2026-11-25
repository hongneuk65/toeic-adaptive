import { jest } from '@jest/globals';
import { BadRequestException, ConflictException, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { GithubAuthService } from './github-auth.service';
import { PrismaService } from '../prisma/prisma.service';

const state = 'a'.repeat(64);
const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response;

class TestGithubAuth extends GithubAuthService {
  calls: Array<{ url: string; init: RequestInit }> = [];
  responses: Record<string, Response> = {};
  protected override http(url: string, init: RequestInit) { this.calls.push({ url, init }); return Promise.resolve(this.responses[url]); }
}

describe('GitHub login', () => {
  const db = { user: { findUnique: jest.fn<any>(), findFirst: jest.fn<any>(), create: jest.fn<any>(), updateMany: jest.fn<any>() } };
  const jwt = new JwtService({ secret: 'github-test-secret-0123456789' });
  let service: TestGithubAuth;
  const env = { ...process.env };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env.GITHUB_CLIENT_ID = 'Iv1.0123456789abcdef';
    process.env.GITHUB_CLIENT_SECRET = 's'.repeat(40);
    process.env.FRONTEND_URL = 'http://localhost:8080/';
    delete process.env.GITHUB_REDIRECT_URI;
    service = new TestGithubAuth(db as unknown as PrismaService, jwt);
    service.responses = {
      'https://github.com/login/oauth/access_token': json({ access_token: 'gho_token' }),
      'https://api.github.com/user': json({ id: 4242, login: 'learner' }),
      'https://api.github.com/user/emails': json([
        { email: '123+learner@users.noreply.github.com', primary: false, verified: true },
        { email: 'Learner@Example.com', primary: true, verified: true },
      ]),
    };
    db.user.findUnique.mockResolvedValue(null);
    db.user.findFirst.mockResolvedValue(null);
    db.user.create.mockImplementation(async ({ data }: any) => ({ id: 9, role: 'USER', ...data }));
  });
  afterAll(() => { process.env = env; });

  it('is disabled without both client id and secret', () => {
    delete process.env.GITHUB_CLIENT_SECRET;
    expect(service.config).toBeNull();
    expect(service.authorizeUrl(state)).toBeNull();
  });

  it('builds the authorize URL with the state and the frontend callback', () => {
    const url = new URL(service.authorizeUrl(state)!);
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: 'Iv1.0123456789abcdef', redirect_uri: 'http://localhost:8080/login/github', scope: 'read:user user:email', state });
    expect(url.toString()).not.toContain('s'.repeat(40));
  });

  it('creates a passwordless learner from the verified primary email and signs an app token', async () => {
    const result = await service.login('code-1', state, state) as { accessToken: string };
    expect(db.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({ email: 'learner@example.com', githubId: '4242' }) });
    expect(db.user.create.mock.calls[0][0].data.passwordHash).toMatch(/^!github-only:/);
    expect(await jwt.verifyAsync(result.accessToken)).toMatchObject({ sub: 9, email: 'learner@example.com', role: 'USER' });
    const exchange = service.calls[0];
    expect(JSON.parse(String(exchange.init.body))).toMatchObject({ code: 'code-1', redirect_uri: 'http://localhost:8080/login/github' });
  });

  it('signs in an already linked GitHub account without touching email accounts', async () => {
    db.user.findUnique.mockResolvedValue({ id: 3, email: 'old@example.com', role: 'ADMIN', githubId: '4242', passwordHash: 'x' });
    const result = await service.login('code-1', state, state) as { accessToken: string };
    expect(await jwt.verifyAsync(result.accessToken)).toMatchObject({ sub: 3, role: 'ADMIN' });
    expect(db.user.findFirst).not.toHaveBeenCalled();
  });

  it.each([[undefined], ['b'.repeat(64)]])('rejects a missing or mismatched state before calling GitHub', async expected => {
    await expect(service.login('code-1', state, expected)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(service.calls).toHaveLength(0);
  });

  it('rejects an unverified email and a failed code exchange', async () => {
    service.responses['https://api.github.com/user/emails'] = json([{ email: 'x@example.com', primary: true, verified: false }]);
    await expect(service.login('code-1', state, state)).rejects.toBeInstanceOf(UnauthorizedException);
    service.responses['https://github.com/login/oauth/access_token'] = json({ error: 'bad_verification_code' });
    await expect(service.login('code-1', state, state)).rejects.toBeInstanceOf(UnauthorizedException);
    service.responses['https://github.com/login/oauth/access_token'] = json({ access_token: 't' });
    service.responses['https://api.github.com/user'] = json({}, false);
    await expect(service.login('code-1', state, state)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('never links an existing email account without its current password', async () => {
    const hash = await bcrypt.hash('dung-mat-khau', 4);
    db.user.findFirst.mockResolvedValue({ id: 5, email: 'learner@example.com', role: 'USER', githubId: null, passwordHash: hash });
    const result = await service.login('code-1', state, state) as { linkRequired: true; linkToken: string; hasPassword: boolean };
    expect(result).toMatchObject({ linkRequired: true, email: 'learner@example.com', hasPassword: true });
    expect(result).not.toHaveProperty('accessToken');
    expect(db.user.create).not.toHaveBeenCalled();

    db.user.findUnique.mockResolvedValue({ id: 5, email: 'learner@example.com', role: 'USER', githubId: null, passwordHash: hash });
    await expect(service.link(result.linkToken, 'sai')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.user.updateMany).not.toHaveBeenCalled();
    db.user.updateMany.mockResolvedValue({ count: 1 });
    const linked = await service.link(result.linkToken, 'dung-mat-khau');
    expect(db.user.updateMany).toHaveBeenCalledWith({ where: { id: 5, githubId: null }, data: { githubId: '4242' } });
    expect(await jwt.verifyAsync(linked.accessToken)).toMatchObject({ sub: 5 });
  });

  it('refuses forged link tokens, passwordless accounts and a second GitHub account', async () => {
    const normal = await jwt.signAsync({ sub: 5, email: 'a@example.com', role: 'USER' });
    await expect(service.link(normal, 'x')).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.link('not-a-token', 'x')).rejects.toBeInstanceOf(UnauthorizedException);
    const token = await jwt.signAsync({ purpose: 'github-link', uid: 5, githubId: '4242' });
    db.user.findUnique.mockResolvedValue({ id: 5, email: 'a@example.com', role: 'USER', githubId: null, passwordHash: '!email-otp-only:x' });
    await expect(service.link(token, 'x')).rejects.toBeInstanceOf(BadRequestException);
    db.user.findUnique.mockResolvedValue(null);
    db.user.findFirst.mockResolvedValue({ id: 5, email: 'learner@example.com', githubId: '999', passwordHash: 'x' });
    await expect(service.login('code-1', state, state)).rejects.toBeInstanceOf(ConflictException);
  });
});
