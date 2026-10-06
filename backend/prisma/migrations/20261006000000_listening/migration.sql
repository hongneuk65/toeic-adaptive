-- CreateTable
CREATE TABLE "ListeningSource" (
    "id" SERIAL NOT NULL,
    "ownerId" INTEGER,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "videoId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningTranscript" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "cacheKey" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "version" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningUnit" (
    "id" SERIAL NOT NULL,
    "transcriptId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "start" DOUBLE PRECISION NOT NULL,
    "end" DOUBLE PRECISION NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "ListeningUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "transcriptId" INTEGER,
    "start" DOUBLE PRECISION NOT NULL,
    "end" DOUBLE PRECISION NOT NULL,
    "currentIndex" INTEGER NOT NULL DEFAULT 0,
    "mode" TEXT NOT NULL DEFAULT 'CLOZE',
    "difficulty" TEXT NOT NULL DEFAULT 'MEDIUM',
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ListeningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningAnswer" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "unitId" INTEGER NOT NULL,
    "mode" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "submitted" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "feedback" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningReport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListeningReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListeningSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "maxSegmentSeconds" INTEGER NOT NULL DEFAULT 300,
    "defaultSegmentSeconds" INTEGER NOT NULL DEFAULT 180,
    "transcriptTtlHours" INTEGER NOT NULL DEFAULT 24,
    "requestsPerHour" INTEGER NOT NULL DEFAULT 10,
    "maxSubtitleBytes" INTEGER NOT NULL DEFAULT 200000,
    "maxRecordingSeconds" INTEGER NOT NULL DEFAULT 60,

    CONSTRAINT "ListeningSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ListeningSource_ownerId_published_idx" ON "ListeningSource"("ownerId", "published");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningTranscript_cacheKey_key" ON "ListeningTranscript"("cacheKey");

-- CreateIndex
CREATE INDEX "ListeningTranscript_sourceId_createdAt_idx" ON "ListeningTranscript"("sourceId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ListeningUnit_transcriptId_position_key" ON "ListeningUnit"("transcriptId", "position");

-- CreateIndex
CREATE INDEX "ListeningSession_userId_updatedAt_idx" ON "ListeningSession"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "ListeningAnswer_sessionId_unitId_idx" ON "ListeningAnswer"("sessionId", "unitId");

-- AddForeignKey
ALTER TABLE "ListeningSource" ADD CONSTRAINT "ListeningSource_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningTranscript" ADD CONSTRAINT "ListeningTranscript_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ListeningSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningUnit" ADD CONSTRAINT "ListeningUnit_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "ListeningTranscript"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningSession" ADD CONSTRAINT "ListeningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningSession" ADD CONSTRAINT "ListeningSession_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ListeningSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningSession" ADD CONSTRAINT "ListeningSession_transcriptId_fkey" FOREIGN KEY ("transcriptId") REFERENCES "ListeningTranscript"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningAnswer" ADD CONSTRAINT "ListeningAnswer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ListeningSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningAnswer" ADD CONSTRAINT "ListeningAnswer_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "ListeningUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningReport" ADD CONSTRAINT "ListeningReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListeningReport" ADD CONSTRAINT "ListeningReport_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ListeningSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
