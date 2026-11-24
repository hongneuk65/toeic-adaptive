import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

interface AdminRequest {
  method: string;
  route?: { path?: string };
  params?: Record<string, string>;
  body?: unknown;
  user?: { id?: number };
}

/** Bounded, credential-free snapshot of what an admin submitted. */
export function summarizeBody(body: unknown, depth = 0): Prisma.InputJsonValue | null {
  if (body === null || body === undefined) return null;
  if (typeof body === 'string') return body.length > 200 ? `${body.slice(0, 200)}… (${body.length} ký tự)` : body;
  if (typeof body === 'number' || typeof body === 'boolean') return body;
  if (depth >= 2) return '[…]';
  if (Array.isArray(body)) return body.slice(0, 20).map(item => summarizeBody(item, depth + 1));
  if (typeof body === 'object')
    return Object.fromEntries(Object.entries(body as Record<string, unknown>)
      .filter(([key]) => !/password|token|secret/i.test(key))
      .map(([key, value]) => [key, summarizeBody(value, depth + 1)]));
  return null;
}

/**
 * Records successful admin mutations after the handler returns. A failed audit write is
 * logged but never turns a committed change into an error response.
 */
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AdminAuditInterceptor.name);
  constructor(private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    if (request.method === 'GET' || request.method === 'HEAD') return next.handle();
    return next.handle().pipe(tap(result => { void this.record(request, result); }));
  }
  async record(request: AdminRequest, result: unknown) {
    try {
      const path = (request.route?.path ?? '').replace(/^\/?(?:api\/)?admin\/?/, '');
      const entity = path.split('/')[0] || 'admin';
      const id = Number(request.params?.id ?? (result as { id?: unknown } | null)?.id);
      const detail = summarizeBody(request.body);
      await this.prisma.adminAuditLog.create({ data: {
        actorId: request.user?.id ?? null,
        action: `${request.method} ${path}`,
        entity,
        entityId: Number.isSafeInteger(id) ? id : null,
        ...(detail === null ? {} : { detail }),
      } });
    } catch (error) {
      this.logger.warn(`Không ghi được nhật ký quản trị: ${(error as Error).message}`);
    }
  }
}
