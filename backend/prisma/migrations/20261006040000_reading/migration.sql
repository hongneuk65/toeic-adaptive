-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "readingKey" TEXT,
ADD COLUMN     "sourceVersionId" INTEGER;

-- AlterTable
ALTER TABLE "FlashcardFolder" ADD COLUMN     "private" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readingKey" TEXT;

-- CreateTable
CREATE TABLE "ReadingArticle" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER,
    "key" TEXT NOT NULL,
    "originalText" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREATING',
    "error" TEXT,
    "generationAttempts" INTEGER NOT NULL DEFAULT 0,
    "currentVersionId" INTEGER,
    "publishedVersionId" INTEGER,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingVersion" (
    "id" SERIAL NOT NULL,
    "articleId" INTEGER NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "questions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "versionId" INTEGER NOT NULL,
    "tryNumber" INTEGER NOT NULL,
    "activeKey" TEXT,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB NOT NULL DEFAULT '{}',
    "hints" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correct" INTEGER,
    "total" INTEGER,
    "elapsedSeconds" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingReport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "versionId" INTEGER NOT NULL,
    "questionIndex" INTEGER,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingAiEvent" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "attemptId" INTEGER,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "inputChars" INTEGER NOT NULL,
    "outputChars" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingAiEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FlashcardReview" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "cardId" INTEGER NOT NULL,
    "known" BOOLEAN NOT NULL DEFAULT false,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReadingArticle_key_key" ON "ReadingArticle"("key");

-- CreateIndex
CREATE INDEX "ReadingArticle_ownerId_archived_idx" ON "ReadingArticle"("ownerId", "archived");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingVersion_articleId_revision_key" ON "ReadingVersion"("articleId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingAttempt_activeKey_key" ON "ReadingAttempt"("activeKey");

-- CreateIndex
CREATE INDEX "ReadingAttempt_userId_updatedAt_idx" ON "ReadingAttempt"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReadingAttempt_userId_versionId_tryNumber_key" ON "ReadingAttempt"("userId", "versionId", "tryNumber");

-- CreateIndex
CREATE INDEX "ReadingAiEvent_userId_createdAt_idx" ON "ReadingAiEvent"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardReview_userId_cardId_key" ON "FlashcardReview"("userId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "Flashcard_readingKey_key" ON "Flashcard"("readingKey");

-- CreateIndex
CREATE UNIQUE INDEX "FlashcardFolder_readingKey_key" ON "FlashcardFolder"("readingKey");

-- AddForeignKey
ALTER TABLE "ReadingArticle" ADD CONSTRAINT "ReadingArticle_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingVersion" ADD CONSTRAINT "ReadingVersion_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "ReadingArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAttempt" ADD CONSTRAINT "ReadingAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAttempt" ADD CONSTRAINT "ReadingAttempt_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReadingVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingReport" ADD CONSTRAINT "ReadingReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingReport" ADD CONSTRAINT "ReadingReport_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "ReadingVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAiEvent" ADD CONSTRAINT "ReadingAiEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingAiEvent" ADD CONSTRAINT "ReadingAiEvent_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ReadingAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardReview" ADD CONSTRAINT "FlashcardReview_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Flashcard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
