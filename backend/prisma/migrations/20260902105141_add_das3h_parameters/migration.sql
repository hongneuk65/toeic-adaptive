-- DropIndex
DROP INDEX "Flashcard_userId_idx";

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "easiness" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "ability" DOUBLE PRECISION NOT NULL DEFAULT 0.0;

-- CreateTable
CREATE TABLE "Das3hWeights" (
    "id" SERIAL NOT NULL,
    "skillId" INTEGER,
    "theta" DOUBLE PRECISION[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Das3hWeights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSkillHistory" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "questionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentSkillHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkillMastery" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "masteryScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "lastPracticed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "practiceCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UserSkillMastery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Das3hWeights_skillId_key" ON "Das3hWeights"("skillId");

-- CreateIndex
CREATE INDEX "StudentSkillHistory_userId_skillId_createdAt_idx" ON "StudentSkillHistory"("userId", "skillId", "createdAt");

-- CreateIndex
CREATE INDEX "UserSkillMastery_userId_idx" ON "UserSkillMastery"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkillMastery_userId_skillId_key" ON "UserSkillMastery"("userId", "skillId");

-- AddForeignKey
ALTER TABLE "Das3hWeights" ADD CONSTRAINT "Das3hWeights_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSkillHistory" ADD CONSTRAINT "StudentSkillHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSkillHistory" ADD CONSTRAINT "StudentSkillHistory_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSkillHistory" ADD CONSTRAINT "StudentSkillHistory_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillMastery" ADD CONSTRAINT "UserSkillMastery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkillMastery" ADD CONSTRAINT "UserSkillMastery_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
