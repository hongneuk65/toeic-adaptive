import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminAccessGuard } from './admin-access.guard';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: {} }],
    })
      .overrideGuard(AdminAccessGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(AdminAuditInterceptor)
      .useValue({ intercept: (_context: unknown, next: { handle: () => unknown }) => next.handle() })
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
