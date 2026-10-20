import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Recheck persisted permissions: a previously issued token cannot retain revoked admin access. */
@Injectable()
export class AdminAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (!Number.isInteger(request.user?.id) || request.user.id <= 0)
      throw new ForbiddenException('Yêu cầu tài khoản quản trị hợp lệ');
    const user = await this.prisma.user.findUnique({
      where: { id: request.user.id },
      select: { role: true },
    });
    if (user?.role !== Role.ADMIN)
      throw new ForbiddenException('Quyền quản trị không còn hiệu lực');
    return true;
  }
}
