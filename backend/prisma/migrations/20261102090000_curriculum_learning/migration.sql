CREATE TABLE "CurriculumEnrollment" (
 "userId" INTEGER NOT NULL, "trackId" TEXT NOT NULL, "catalogVersion" TEXT NOT NULL DEFAULT 'curriculum-v1', "minutesPerDay" INTEGER NOT NULL,
 "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CurriculumEnrollment_pkey" PRIMARY KEY ("userId"),
 CONSTRAINT "CurriculumEnrollment_minutes_check" CHECK ("minutesPerDay" IN (15,30,45,60))
);
CREATE TABLE "CurriculumProgress" (
 "id" SERIAL NOT NULL, "userId" INTEGER NOT NULL, "unitId" TEXT NOT NULL,
 "completedAt" TIMESTAMP(3), "bestScore" INTEGER NOT NULL DEFAULT 0, "reviewStage" INTEGER NOT NULL DEFAULT 0,
 "nextReviewAt" TIMESTAMP(3), "lastAttemptAt" TIMESTAMP(3) NOT NULL, "revision" INTEGER NOT NULL DEFAULT 0,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CurriculumProgress_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "CurriculumProgress_score_check" CHECK ("bestScore" BETWEEN 0 AND 100),
 CONSTRAINT "CurriculumProgress_stage_check" CHECK ("reviewStage" BETWEEN 0 AND 4)
);
CREATE TABLE "CurriculumAttempt" (
 "id" SERIAL NOT NULL, "userId" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "unitId" TEXT NOT NULL,
 "catalogVersion" TEXT NOT NULL, "payloadHash" TEXT NOT NULL, "answers" JSONB NOT NULL,
 "result" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CurriculumAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CurriculumProgress_userId_unitId_key" ON "CurriculumProgress"("userId", "unitId");
CREATE INDEX "CurriculumProgress_userId_nextReviewAt_idx" ON "CurriculumProgress"("userId", "nextReviewAt");
CREATE UNIQUE INDEX "CurriculumAttempt_userId_requestId_key" ON "CurriculumAttempt"("userId", "requestId");
CREATE INDEX "CurriculumAttempt_userId_unitId_createdAt_idx" ON "CurriculumAttempt"("userId", "unitId", "createdAt");
ALTER TABLE "CurriculumEnrollment" ADD CONSTRAINT "CurriculumEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumProgress" ADD CONSTRAINT "CurriculumProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CurriculumAttempt" ADD CONSTRAINT "CurriculumAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
