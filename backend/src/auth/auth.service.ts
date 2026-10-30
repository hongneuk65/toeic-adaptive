import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async learningStatus(userId: number) {
        const user = await this.prisma.user.findUniqueOrThrow({
            where: { id: userId },
            select: { role: true, onboardingChoice: true, _count: { select: {
                examAttempts: true, placementAttempts: true, studentSkillHistories: true,
                readingAttempts: true, listeningSessions: true, flashcardReviews: true,
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

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (existing) {
            throw new ConflictException('Email đã được sử dụng');
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(dto.password, salt);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
            },
            select: {
                id: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return user;
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });
        if (!user) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
        }

        const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
        if (!isMatch) {
            throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
        }

        const payload = { sub: user.id, email: user.email, role: user.role };
        return {
            accessToken: await this.jwtService.signAsync(payload),
        };
    }
}   