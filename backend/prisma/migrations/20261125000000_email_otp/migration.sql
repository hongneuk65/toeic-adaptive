-- One-time email login codes. Only a keyed hash of the code is stored.
CREATE TABLE "EmailOtp" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EmailOtp_email_createdAt_idx" ON "EmailOtp"("email", "createdAt");
