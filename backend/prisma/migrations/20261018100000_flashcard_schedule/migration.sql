ALTER TABLE "FlashcardReview" ADD COLUMN "intervalDays" INTEGER NOT NULL DEFAULT 0, ADD COLUMN "dueAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX "FlashcardReview_userId_dueAt_idx" ON "FlashcardReview"("userId", "dueAt");
