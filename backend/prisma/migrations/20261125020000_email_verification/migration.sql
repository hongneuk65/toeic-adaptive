-- Email verification for password accounts and password reset codes.
-- Accounts created before this migration keep working: they are treated as verified.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);
UPDATE "User" SET "emailVerifiedAt" = "createdAt";

-- Earlier codes were passwordless sign-in codes; they expire within minutes and are retired here.
UPDATE "EmailOtp" SET "consumedAt" = CURRENT_TIMESTAMP WHERE "consumedAt" IS NULL;
ALTER TABLE "EmailOtp" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'REGISTER';
DROP INDEX "EmailOtp_email_createdAt_idx";
CREATE INDEX "EmailOtp_email_purpose_createdAt_idx" ON "EmailOtp"("email", "purpose", "createdAt");
