import { CanActivate, ExecutionContext, HttpException, Injectable, Module, ServiceUnavailableException } from '@nestjs/common';
import { BullModule, InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID, createHash } from 'node:crypto';
import type { Request, Response } from 'express';

const acquire = `
if tonumber(ARGV[3])>0 then
 redis.call('ZREMRANGEBYSCORE',KEYS[2],'-inf',ARGV[4])
 if redis.call('ZCARD',KEYS[2])>=tonumber(ARGV[3]) then return 2 end
end
local count=redis.call('INCR',KEYS[1]); if count==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end
if count>tonumber(ARGV[2]) then return 1 end
if tonumber(ARGV[3])>0 then
 redis.call('ZADD',KEYS[2],tonumber(ARGV[4])+120000,ARGV[5]); redis.call('EXPIRE',KEYS[2],120)
end
return 0`;

/** Distributed limits shared by API replicas; leases recover after a crashed process. */
@Injectable()
export class RequestBudgetGuard implements CanActivate {
  constructor(@InjectQueue('request-budget') private readonly queue: Queue) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request & { user?: { id?: number; userId?: number } }>();
    const response = context.switchToHttp().getResponse<Response>();
    const auth = request.path.replace(/^\/api(?=\/)/, '').startsWith('/auth/');
    if (auth && request.method !== 'POST') return true;
    if (!auth && request.method !== 'POST') return true;
    const userId = request.user?.id ?? request.user?.userId;
    const identity = auth ? createHash('sha256').update(request.ip || request.socket.remoteAddress || 'unknown').digest('hex') : String(userId);
    if (!auth && !userId) return false;
    const seconds = auth ? 60 : 86400;
    const maximum = auth ? 20 : 100;
    const scope = auth ? 'auth' : 'rag';
    const key = `budget:${scope}:${identity}`;
    const lease = randomUUID();
    let client: Awaited<ReturnType<Queue['getBackend']>['client']>;
    try {
      client = await this.queue.getBackend().client;
      client.defineCommand('acquireRequestBudget', { numberOfKeys: 2, lua: acquire });
      const result = Number(await client.runCommand('acquireRequestBudget', [key, `${key}:active`, String(seconds), String(maximum), auth ? '0' : '2', String(Date.now()), lease]));
      if (result) {
        response.setHeader('Retry-After', result === 2 ? '15' : String(seconds));
        throw new HttpException(result === 2 ? 'Đang có hai yêu cầu AI. Chờ câu trả lời hoàn tất rồi thử lại.' : auth ? 'Bạn thử đăng nhập quá nhiều lần. Vui lòng thử lại sau một phút.' : 'Đã đạt giới hạn 100 yêu cầu AI trong ngày. Bạn vẫn có thể học nội dung đã lưu.', 429);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new ServiceUnavailableException('Chưa kiểm tra được giới hạn yêu cầu. Vui lòng thử lại sau.');
    }
    if (!auth) {
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        response.off('finish', release);
        response.off('close', release);
        client.defineCommand('releaseRequestBudget', { numberOfKeys: 1, lua: "return redis.call('ZREM',KEYS[1],ARGV[1])" });
        void client.runCommand('releaseRequestBudget', [`${key}:active`, lease]).catch(() => undefined);
      };
      response.once('finish', release);
      response.once('close', release);
    }
    return true;
  }
}

@Module({
  imports: [BullModule.registerQueue({ name: 'request-budget' })],
  providers: [RequestBudgetGuard],
  exports: [RequestBudgetGuard, BullModule],
})
export class RequestBudgetModule {}
