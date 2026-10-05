import { UnauthorizedException } from '@nestjs/common';

export interface UserIdentity {
  id?: unknown;
  userId?: unknown;
  sub?: unknown;
}

export interface RequestWithUser {
  user?: UserIdentity;
}

/** Resolve the supported JWT identity fields without changing the API contract. */
export function getOptionalUserId(identity?: UserIdentity): number | undefined {
  const rawId = identity?.userId ?? identity?.sub ?? identity?.id;
  if (rawId === undefined || rawId === null || rawId === '') return undefined;

  const userId = Number(rawId);
  return Number.isSafeInteger(userId) && userId > 0 ? userId : undefined;
}

export function getUserId(
  request: RequestWithUser,
  message = 'Không xác định được danh tính người dùng.',
): number {
  const userId = getOptionalUserId(request.user);
  if (userId === undefined) throw new UnauthorizedException(message);
  return userId;
}