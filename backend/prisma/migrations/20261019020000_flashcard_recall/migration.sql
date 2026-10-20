ALTER TABLE "FlashcardReview"
ADD COLUMN "recallWins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "recallLosses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastPracticedAt" TIMESTAMP(3),
ADD COLUMN "contentHash" TEXT,
ADD COLUMN "schedulingSource" TEXT NOT NULL DEFAULT 'fixed-interval';
CREATE TABLE "FlashcardRecallEvent" (
 "id" SERIAL PRIMARY KEY, "reviewId" INTEGER NOT NULL,
 "attemptId" TEXT NOT NULL, "requestHash" TEXT NOT NULL, "contentHash" TEXT NOT NULL,
 "recallMode" TEXT NOT NULL, "correct" BOOLEAN NOT NULL, "elapsedMs" INTEGER,
 "lagDays" DOUBLE PRECISION NOT NULL, "priorWins" INTEGER NOT NULL, "priorLosses" INTEGER NOT NULL,
 "predictedRecall" DOUBLE PRECISION, "schedulingSource" TEXT NOT NULL, "result" JSONB NOT NULL,
 "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "FlashcardRecallEvent_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "FlashcardReview"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "FlashcardRecallEvent_attemptId_key" ON "FlashcardRecallEvent"("attemptId");
CREATE INDEX "FlashcardRecallEvent_reviewId_occurredAt_idx" ON "FlashcardRecallEvent"("reviewId", "occurredAt");
