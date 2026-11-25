import { resolveSmtp } from './mail.service';

describe('resolveSmtp', () => {
  const gmail = { SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465', SMTP_SECURE: 'true', SMTP_USER: 'sender@gmail.com' };

  it('uses Gmail when the app password is present', () => {
    expect(resolveSmtp({ ...gmail, SMTP_PASS: 'abcd efgh ijkl mnop', SMTP_FALLBACK_HOST: 'mailpit' })).toEqual({ host: 'smtp.gmail.com', port: 465, secure: true, user: 'sender@gmail.com', pass: 'abcdefghijklmnop', fallback: false });
  });

  it('falls back to the local test inbox when the app password is missing', () => {
    expect(resolveSmtp({ ...gmail, SMTP_PASS: '', SMTP_FALLBACK_HOST: 'mailpit', SMTP_FALLBACK_PORT: '1025' })).toEqual({ host: 'mailpit', port: 1025, secure: false, fallback: true });
  });

  it('uses an unauthenticated host such as Mailpit directly', () => {
    expect(resolveSmtp({ SMTP_HOST: 'mailpit', SMTP_PORT: '1025' })).toMatchObject({ host: 'mailpit', port: 1025, fallback: false, user: undefined });
  });

  it('returns null when nothing is configured', () => {
    expect(resolveSmtp({})).toBeNull();
  });
});
