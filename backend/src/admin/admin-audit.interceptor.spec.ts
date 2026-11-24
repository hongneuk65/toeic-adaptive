import { jest } from '@jest/globals';
import { lastValueFrom, of } from 'rxjs';
import { AdminAuditInterceptor, summarizeBody } from './admin-audit.interceptor';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminAuditInterceptor', () => {
  const prisma = { adminAuditLog: { create: jest.fn() } };
  const interceptor = new AdminAuditInterceptor(prisma as unknown as PrismaService);
  const context = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as never;
  beforeEach(() => jest.resetAllMocks());

  it('bounds submitted content and drops credential-like keys', () => {
    expect(summarizeBody({ content: 'x'.repeat(250), password: 'p', skillIds: [1, 2] })).toEqual({
      content: `${'x'.repeat(200)}… (250 ký tự)`, skillIds: [1, 2],
    });
  });
  it('records successful mutations with actor, route and entity id', async () => {
    prisma.adminAuditLog.create.mockResolvedValue({});
    const request = { method: 'PATCH', route: { path: '/api/admin/questions/:id/status' }, params: { id: '7' }, body: { status: 'PUBLISHED' }, user: { id: 3 } };
    await lastValueFrom(interceptor.intercept(context(request), { handle: () => of({ id: 7 }) }));
    await new Promise(resolve => setImmediate(resolve));
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({ data: {
      actorId: 3, action: 'PATCH questions/:id/status', entity: 'questions', entityId: 7, detail: { status: 'PUBLISHED' },
    } });
  });
  it('uses the created id for POST and ignores reads', async () => {
    prisma.adminAuditLog.create.mockResolvedValue({});
    await interceptor.record({ method: 'POST', route: { path: '/api/admin/questions' }, body: {}, user: { id: 3 } }, { id: 41 });
    expect(prisma.adminAuditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ entity: 'questions', entityId: 41 }) });
    prisma.adminAuditLog.create.mockClear();
    await lastValueFrom(interceptor.intercept(context({ method: 'GET' }), { handle: () => of([]) }));
    expect(prisma.adminAuditLog.create).not.toHaveBeenCalled();
  });
  it('never fails the request when the audit write fails', async () => {
    prisma.adminAuditLog.create.mockRejectedValue(new Error('db down'));
    await expect(interceptor.record({ method: 'POST', route: { path: '/api/admin/skills' }, user: { id: 1 } }, { id: 2 })).resolves.toBeUndefined();
  });
});
