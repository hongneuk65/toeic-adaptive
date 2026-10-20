import { jest } from '@jest/globals';
import type { Request, Response } from 'express';
import { GoogleAuthController } from './google-auth.controller';
import { GoogleAuthService } from './google-auth.service';

describe('Google browser challenge', () => {
  const originalEnv = process.env.NODE_ENV;
  const google = { clientId: '123-test.apps.googleusercontent.com' as string | null, login: jest.fn() };
  const response = { cookie: jest.fn(), clearCookie: jest.fn(), setHeader: jest.fn() };
  const controller = new GoogleAuthController(google as unknown as GoogleAuthService);
  beforeEach(() => { jest.clearAllMocks(); process.env.NODE_ENV = 'production'; google.clientId = '123-test.apps.googleusercontent.com'; });
  afterEach(() => { process.env.NODE_ENV = originalEnv; });
  it('creates a fresh secure HttpOnly host cookie and sends the same nonce for Google', () => {
    const result = controller.config(response as unknown as Response);
    expect(result.nonce).toMatch(/^[a-f0-9]{64}$/);
    expect(response.cookie).toHaveBeenCalledWith('__Host-toeic_google_nonce', result.nonce, expect.objectContaining({ secure: true, httpOnly: true, sameSite: 'strict', path: '/' }));
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });
  it('does not issue challenges when disabled', () => {
    google.clientId = null;
    expect(controller.config(response as unknown as Response)).toEqual({ enabled: false });
    expect(response.cookie).not.toHaveBeenCalled();
  });
  it('reads the nonce cookie and clears it only after successful login', async () => {
    google.login.mockResolvedValue({ accessToken: 'jwt' });
    const request = { headers: { cookie: `other=value; __Host-toeic_google_nonce=${'a'.repeat(64)}` } } as Request;
    expect(await controller.login({ credential: 'google-token' }, request, response as unknown as Response)).toEqual({ accessToken: 'jwt' });
    expect(google.login).toHaveBeenCalledWith({ credential: 'google-token' }, 'a'.repeat(64));
    expect(response.clearCookie).toHaveBeenCalled();
    response.clearCookie.mockClear(); google.login.mockRejectedValueOnce(new Error('requires link'));
    await expect(controller.login({ credential: 'google-token' }, request, response as unknown as Response)).rejects.toThrow();
    expect(response.clearCookie).not.toHaveBeenCalled();
  });
});
