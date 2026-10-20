import { UnauthorizedException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('JwtStrategy live permissions', () => {
  const findUnique = jest.fn();
  let strategy: JwtStrategy;
  beforeEach(() => {
    process.env.JWT_SECRET ||= 'test-only-secret';
    findUnique.mockReset();
    strategy = new JwtStrategy({ user: { findUnique } } as unknown as PrismaService);
  });

  it('uses the current database role after an administrator is demoted', async () => {
    findUnique.mockResolvedValue({ id: 7, email: 'student@example.com', role: Role.USER });
    const user = await strategy.validate({ sub: 7 });
    expect(user.role).toBe(Role.USER);
    expect(user.userId).toBe(7);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 7 }, select: { id: true, email: true, role: true } });
  });

  it('rejects sessions for deleted accounts', async () => {
    findUnique.mockResolvedValue(null);
    await expect(strategy.validate({ sub: 7 })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects malformed subject identifiers before querying the database', async () => {
    await expect(strategy.validate({ sub: NaN })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
