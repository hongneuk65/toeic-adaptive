/*
  Warnings:

  - You are about to drop the column `updatedAt` on the `Flashcard` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Flashcard_topic_idx";

-- AlterTable
ALTER TABLE "Flashcard" DROP COLUMN "updatedAt",
ADD COLUMN     "folderId" INTEGER,
ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "topic" DROP NOT NULL;

-- CreateTable
CREATE TABLE "FlashcardFolder" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FlashcardFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FlashcardFolder_userId_idx" ON "FlashcardFolder"("userId");

-- CreateIndex
CREATE INDEX "Flashcard_folderId_idx" ON "Flashcard"("folderId");

-- CreateIndex
CREATE INDEX "Flashcard_userId_idx" ON "Flashcard"("userId");

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flashcard" ADD CONSTRAINT "Flashcard_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "FlashcardFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FlashcardFolder" ADD CONSTRAINT "FlashcardFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
