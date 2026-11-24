import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RequestBudgetGuard } from '../common/request-budget.guard';
import { EmailOtpService } from './email-otp.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: {} }, { provide: EmailOtpService, useValue: { enabled: false } }],
    }).overrideGuard(RequestBudgetGuard).useValue({ canActivate: () => true }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
