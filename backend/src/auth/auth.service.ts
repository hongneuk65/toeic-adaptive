import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EMAIL_OTP_POLICY, EmailOtpService, IssuedCode, normalizeEmail } from './email-otp.service';

export type RegistrationResult =
    | { email: string; verificationRequired: false }
    | ({ email: string; verificationRequired: true; sendError?: string } & Partial<IssuedCode>);

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private emailOtp: EmailOtpService,
    ) { }

    async learningStatus(userId: number) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { role: true, onboardingChoice: true, _count: { select: {
                examAttempts: true, placementAttempts: true, studentSkillHistories: true,
                readingAttempts: true, listeningSessions: true, flashcardReviews: true, curriculumAttempts: true,
            } } },
        });
        const hasLearningActivity = Object.values(user._count).some(count => count > 0);
        return {
            hasLearningActivity,
            onboardingChoice: user.onboardingChoice as 'ASSESSMENT' | 'SELF_STUDY' | null,
            onboardingRequired: user.role === 'USER' && !user.onboardingChoice && !hasLearningActivity,
        };
    }

    async chooseOnboarding(userId: number, choice: 'ASSESSMENT' | 'SELF_STUDY') {
        await this.prisma.user.update({ where: { id: userId }, data: { onboardingChoice: choice } });
        return this.learningStatus(userId);
    }

    /**
     * Đăng ký: tạo tài khoản chưa xác nhận rồi gửi mã 6 số tới email.
     * Khi máy chủ chưa cấu hình gửi email, tài khoản được coi là đã xác nhận để vẫn dùng được.
     */
    async register(dto: RegisterDto): Promise<RegistrationResult> {
        const email = normalizeEmail(dto.email);
        const existing = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (existing?.emailVerifiedAt) throw new ConflictException('Email đã được sử dụng');
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const verificationRequired = this.emailOtp.enabled;
        const verifiedAt = verificationRequired ? null : new Date();
        if (existing) {
            // Đăng ký lại một email chưa xác nhận: người giữ hộp thư mới là chủ tài khoản.
            await this.prisma.user.update({ where: { id: existing.id }, data: { passwordHash, emailVerifiedAt: verifiedAt } });
        } else {
            try {
                await this.prisma.user.create({ data: { email, passwordHash, emailVerifiedAt: verifiedAt } });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Email đã được sử dụng');
                throw error;
            }
        }
        if (!verificationRequired) return { email, verificationRequired: false };
        try {
            return { email, verificationRequired: true, ...await this.emailOtp.issue(email, 'REGISTER') };
        } catch (error) {
            // Tài khoản đã được tạo; người học có thể bấm gửi lại mã ở bước tiếp theo.
            return { email, verificationRequired: true, sendError: error instanceof HttpException ? String(this.messageOf(error)) : 'Chưa gửi được email. Vui lòng gửi lại mã.' };
        }
    }

    async resendRegistration(rawEmail: string) {
        const email = normalizeEmail(rawEmail);
        const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (!user || user.emailVerifiedAt) throw new BadRequestException('Không có tài khoản nào đang chờ xác nhận với email này.');
        return this.emailOtp.issue(email, 'REGISTER');
    }

    async verifyRegistration(rawEmail: string, code: string) {
        const email = normalizeEmail(rawEmail);
        const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (!user || user.emailVerifiedAt) throw new UnauthorizedException('Mã không đúng hoặc đã hết hạn. Vui lòng đăng nhập hoặc gửi lại mã mới.');
        if (!user.emailVerifiedAt) {
            await this.emailOtp.consume(email, 'REGISTER', code);
            await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
        }
        return this.token(user);
    }

    async login(dto: LoginDto) {
        const email = normalizeEmail(dto.email);
        const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
        }
        if (!user.emailVerifiedAt) {
            if (this.emailOtp.enabled) throw new ForbiddenException('Email chưa được xác nhận. Nhập mã đã gửi tới email hoặc gửi lại mã mới.');
            await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
        }
        return this.token(user);
    }

    /** Luôn trả cùng một phản hồi để không lộ email nào đã có tài khoản. */
    async forgotPassword(rawEmail: string) {
        const email = normalizeEmail(rawEmail);
        const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } }, select: { id: true } });
        if (!user) {
            if (!this.emailOtp.enabled) throw new ServiceUnavailableException('Chức năng gửi mã qua email chưa được bật.');
            return { expiresInSeconds: EMAIL_OTP_POLICY.ttlMinutes * 60, resendAfterSeconds: EMAIL_OTP_POLICY.resendSeconds };
        }
        return this.emailOtp.issue(email, 'RESET_PASSWORD');
    }

    async resetPassword(rawEmail: string, code: string, password: string) {
        const email = normalizeEmail(rawEmail);
        await this.emailOtp.consume(email, 'RESET_PASSWORD', code);
        const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
        if (!user) throw new UnauthorizedException('Mã không đúng hoặc đã hết hạn. Vui lòng gửi lại mã mới.');
        const updated = await this.prisma.user.update({ where: { id: user.id }, data: {
            passwordHash: await bcrypt.hash(password, 10),
            emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        } });
        return this.token(updated);
    }

    private async token(user: { id: number; email: string; role: string }) {
        return { accessToken: await this.jwtService.signAsync({ sub: user.id, email: user.email, role: user.role }) };
    }

    private messageOf(error: HttpException) {
        const response = error.getResponse();
        return typeof response === 'string' ? response : (response as { message?: unknown }).message ?? error.message;
    }
}
