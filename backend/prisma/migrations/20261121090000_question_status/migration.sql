-- Existing rows keep learner-visible behaviour: they default to PUBLISHED.
CREATE TYPE "QuestionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

ALTER TABLE "Question" ADD COLUMN "status" "QuestionStatus" NOT NULL DEFAULT 'PUBLISHED';

CREATE INDEX "Question_status_idx" ON "Question"("status");
