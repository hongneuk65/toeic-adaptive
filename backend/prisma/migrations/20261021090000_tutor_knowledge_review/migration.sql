ALTER TABLE "KnowledgeChunk"
  ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "sourceUri" TEXT,
  ADD COLUMN "sourceVersion" TEXT,
  ADD COLUMN "reviewedAt" TIMESTAMP(3),
  ADD COLUMN "reviewedBy" TEXT,
  ADD COLUMN "approvedContentHash" TEXT;
