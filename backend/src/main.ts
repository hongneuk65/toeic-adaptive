import './config/environment';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const webRoot = process.env.SERVE_FRONTEND === '1' ? resolve(process.cwd(), 'public') : null;
  if (webRoot) {
    if (!existsSync(resolve(webRoot, 'index.html'))) throw new Error('Built frontend is missing');
    app.setGlobalPrefix('api');
    app.useStaticAssets(webRoot);
  }
  // Opt in only when the API is reached through the deployment's single trusted proxy.
  app.set('trust proxy', process.env.TRUST_PROXY === '1' ? 1 : false);
  app.useBodyParser('json', { limit: '300kb' });

  // Bật CORS cho phép Frontend truy cập
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    exposedHeaders: ['Retry-After'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();
  if (webRoot) {
    await app.init();
    app.getHttpAdapter().getInstance().get('/{*path}', (request: { path: string }, response: { sendFile: (file: string) => void }, next: () => void) => {
      if (request.path === '/api' || request.path.startsWith('/api/')) return next();
      response.sendFile(resolve(webRoot, 'index.html'));
    });
  }
  await app.listen(Number(process.env.PORT) || 3000);
}
bootstrap();
