import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// Imported before AppModule so JWT and Redis read the same environment.
const envPath = [resolve(process.cwd(), '.env'), resolve(process.cwd(), 'backend/.env')]
  .find((path) => existsSync(path));
if (envPath) process.loadEnvFile(envPath);

if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required in production');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET === 'jwt-secret-key-toeic-mvp') {
    throw new Error('Set a strong JWT_SECRET of at least 32 characters in production');
  }
}
