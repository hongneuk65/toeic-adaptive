import { HttpException, ServiceUnavailableException } from '@nestjs/common';

/** Bound both Redis connection acquisition and the command; never allow a
 * dependent write when the distributed limiter cannot confirm its result. */
export async function withRateLimitTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = 3000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Rate limit verification timed out'));
    }, timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => operation(controller.signal)), deadline]);
  } catch (error) {
    if (error instanceof HttpException && error.getStatus() === 429) throw error;
    throw new ServiceUnavailableException('Chưa kiểm tra được giới hạn yêu cầu. Vui lòng thử lại sau.');
  } finally {
    clearTimeout(timer);
  }
}

export function rateLimitCount(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') throw new Error('Invalid rate limit result');
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Invalid rate limit result');
  return count;
}
