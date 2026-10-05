ALTER TABLE "ExamAttempt" ADD COLUMN "questionIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];

-- Preserve the available question list for already submitted attempts.
UPDATE "ExamAttempt" AS attempt
SET "questionIds" = answers.ids
FROM (
  SELECT "attemptId", array_agg("questionId" ORDER BY "id") AS ids
  FROM "ExamAnswer" GROUP BY "attemptId"
) AS answers
WHERE attempt."id" = answers."attemptId" AND attempt."submittedAt" IS NOT NULL;

-- These models were previously available via db push without migration history.
-- IF NOT EXISTS preserves those databases as well as supporting fresh installs.
CREATE TABLE IF NOT EXISTS "KnowledgeChunk" (
  "id" SERIAL PRIMARY KEY,
  "part" INTEGER NOT NULL,
  "skillCode" TEXT,
  "category" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "keywords" TEXT[],
  "lessonId" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_part_idx" ON "KnowledgeChunk"("part");
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_skillCode_idx" ON "KnowledgeChunk"("skillCode");
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_category_idx" ON "KnowledgeChunk"("category");

CREATE TABLE IF NOT EXISTS "AiChatMessage" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contextData" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AiChatMessage_userId_createdAt_idx" ON "AiChatMessage"("userId", "createdAt");

CREATE TABLE "ProcessedMasteryJob" (
  "id" TEXT PRIMARY KEY,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);