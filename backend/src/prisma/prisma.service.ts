import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    super({
      log: ['query'], // In mọi câu lệnh SQL thực tế ra terminal để kiểm tra hiệu năng
    });
  }

  async onModuleInit() {
    await this.$connect();
  }
}