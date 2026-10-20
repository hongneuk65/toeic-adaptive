import { jest } from '@jest/globals';
import { EventEmitter } from 'node:events';
import { ExecutionContext } from '@nestjs/common';
import { Queue } from 'bullmq';
import { RequestBudgetGuard } from './request-budget.guard';

describe('shared request budget', () => {
  const client = { defineCommand: jest.fn(), runCommand: jest.fn<(...args: any[]) => Promise<number>>() };
  const queue = { getBackend: () => ({ client: Promise.resolve(client) }) } as unknown as Queue;
  function context(path = '/rag/chat-stream') {
    const response = Object.assign(new EventEmitter(), { setHeader: jest.fn() });
    const request = { path, method: 'POST', ip: '127.0.0.1', user: { id: 42 }, socket: {} };
    return { response, value: { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) } as ExecutionContext };
  }
  beforeEach(() => { jest.clearAllMocks(); client.runCommand.mockResolvedValue(0); });
  it('releases a concurrency lease once on completion/disconnect', async () => {
    const { response, value } = context();
    expect(await new RequestBudgetGuard(queue).canActivate(value)).toBe(true);
    response.emit('finish'); response.emit('close');
    expect(client.runCommand.mock.calls.filter(args => args[0] === 'releaseRequestBudget')).toHaveLength(1);
    expect(response.listenerCount('close')).toBe(0);
  });
  it('returns 429 and a retry delay without allocating listeners when full', async () => {
    client.runCommand.mockResolvedValue(2);
    const { response, value } = context();
    await expect(new RequestBudgetGuard(queue).canActivate(value)).rejects.toMatchObject({ status: 429 });
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '15');
    expect(response.listenerCount('close')).toBe(0);
  });
  it('uses a bounded auth IP bucket and fails closed if Redis is unavailable', async () => {
    const { value } = context('/auth/login');
    await new RequestBudgetGuard(queue).canActivate(value);
    expect(client.runCommand.mock.calls[0][1][2]).toBe('60');
    client.runCommand.mockRejectedValue(new Error('offline'));
    await expect(new RequestBudgetGuard(queue).canActivate(value)).rejects.toMatchObject({ status: 503 });
  });
  it('recognizes public authentication routes behind the unified /api prefix', async () => {
    const { value } = context('/api/auth/register');
    const request = value.switchToHttp().getRequest();
    delete request.user;
    expect(await new RequestBudgetGuard(queue).canActivate(value)).toBe(true);
    expect(client.runCommand.mock.calls[0][1][2]).toBe('60');
  });
});
