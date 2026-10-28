ALTER TABLE "User" ADD COLUMN "learningPreferences" JSONB;
CREATE TABLE "PlacementAttempt" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "revision" INTEGER NOT NULL DEFAULT 0,
  "seed" TEXT NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "goal" TEXT NOT NULL,
  "targetScore" INTEGER,
  "issued" JSONB NOT NULL,
  "responses" JSONB NOT NULL,
  "result" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadlineAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PlacementAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlacementAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "PlacementAttempt_userId_startedAt_idx" ON "PlacementAttempt"("userId", "startedAt");
CREATE UNIQUE INDEX "PlacementAttempt_one_active_per_user" ON "PlacementAttempt"("userId") WHERE "status" = 'ACTIVE';
