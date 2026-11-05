ALTER TABLE "ListeningAnswer"
ADD COLUMN "requestUserId" INTEGER,
ADD COLUMN "requestId" TEXT,
ADD COLUMN "requestHash" TEXT;

CREATE UNIQUE INDEX "ListeningAnswer_requestUserId_requestId_key"
ON "ListeningAnswer"("requestUserId", "requestId");
