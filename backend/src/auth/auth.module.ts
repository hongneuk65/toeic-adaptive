import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RequestBudgetModule } from '../common/request-budget.guard';
import { GoogleAuthService } from './google-auth.service';
import { GoogleAuthController } from './google-auth.controller';
import { EmailOtpService } from './email-otp.service';
import { MailService } from './mail.service';
import { GithubAuthService } from './github-auth.service';
import { GithubAuthController } from './github-auth.controller';

@Module({
  imports: [
    RequestBudgetModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'jwt-secret-key-toeic-mvp',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, GoogleAuthController, GithubAuthController],
  providers: [AuthService, JwtStrategy, GoogleAuthService, GithubAuthService, EmailOtpService, MailService],
  exports: [AuthService],
})
export class AuthModule { }
