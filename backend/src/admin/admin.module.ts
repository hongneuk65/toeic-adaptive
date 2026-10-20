import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

import { AdminAccessGuard } from './admin-access.guard';

@Module({
  providers: [AdminService, AdminAccessGuard],
  controllers: [AdminController],
})
export class AdminModule {}
