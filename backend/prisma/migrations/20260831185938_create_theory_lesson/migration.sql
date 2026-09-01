-- CreateTable
CREATE TABLE "TheoryLesson" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "part" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TheoryLesson_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TheoryLesson_part_idx" ON "TheoryLesson"("part");

-- CreateIndex
CREATE INDEX "TheoryLesson_skillId_idx" ON "TheoryLesson"("skillId");

-- AddForeignKey
ALTER TABLE "TheoryLesson" ADD CONSTRAINT "TheoryLesson_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
