ALTER TABLE "User" ADD COLUMN "onboardingChoice" TEXT;
ALTER TABLE "User" ADD CONSTRAINT "User_onboardingChoice_check" CHECK ("onboardingChoice" IS NULL OR "onboardingChoice" IN ('ASSESSMENT', 'SELF_STUDY'));
