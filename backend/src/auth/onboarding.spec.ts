import { jest } from '@jest/globals';
import { validate } from 'class-validator';
import type { JwtService } from '@nestjs/jwt';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { OnboardingDto } from './dto/onboarding.dto';

const counts = () => ({ examAttempts: 0, placementAttempts: 0, studentSkillHistories: 0, readingAttempts: 0, listeningSessions: 0, flashcardReviews: 0 });
describe('Account learning entry', () => {
  const find = jest.fn<(...args: any[]) => Promise<any>>();
  const update = jest.fn<(...args: any[]) => Promise<any>>();
  const service = new AuthService({ user: { findUniqueOrThrow: find, update } } as unknown as PrismaService, {} as JwtService);
  beforeEach(() => { find.mockReset(); update.mockReset(); });
  it('offers optional placement only to an unassessed learner without activity', async () => {
    find.mockResolvedValue({ role: 'USER', onboardingChoice: null, _count: counts() });
    expect(await service.learningStatus(7)).toEqual({ hasLearningActivity: false, onboardingChoice: null, onboardingRequired: true });
    find.mockResolvedValue({ role: 'ADMIN', onboardingChoice: null, _count: counts() });
    expect((await service.learningStatus(8)).onboardingRequired).toBe(false);
  });
  it.each(Object.keys(counts()))('recognizes returning learners with only %s', async channel => {
    find.mockResolvedValue({ role: 'USER', onboardingChoice: null, _count: { ...counts(), [channel]: 1 } });
    expect(await service.learningStatus(7)).toMatchObject({ hasLearningActivity: true, onboardingRequired: false });
  });
  it.each(['SELF_STUDY', 'ASSESSMENT'] as const)('persists %s without inventing learning history', async choice => {
    let saved: string | null = null;
    update.mockImplementation(async args => { saved = args.data.onboardingChoice; return {}; });
    find.mockImplementation(async () => ({ role: 'USER', onboardingChoice: saved, _count: counts() }));
    expect(await service.chooseOnboarding(7, choice)).toEqual({ hasLearningActivity: false, onboardingChoice: choice, onboardingRequired: false });
    expect(update).toHaveBeenCalledWith({ where: { id: 7 }, data: { onboardingChoice: choice } });
    expect((await service.learningStatus(7)).onboardingRequired).toBe(false);
  });
  it('rejects missing or unknown choices at the request boundary', async () => {
    expect(await validate(Object.assign(new OnboardingDto(), { choice: 'SKIP_FOREVER' }))).not.toHaveLength(0);
    expect(await validate(new OnboardingDto())).not.toHaveLength(0);
    expect(await validate(Object.assign(new OnboardingDto(), { choice: 'SELF_STUDY' }))).toHaveLength(0);
  });
});
