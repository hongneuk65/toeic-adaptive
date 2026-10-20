CREATE TABLE "TrainedDas3hState" (
  "userId" INTEGER NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "ability" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainedDas3hState_pkey" PRIMARY KEY ("userId", "modelVersion"),
  CONSTRAINT "TrainedDas3hState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "TrainedDas3hObservation" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "sourceQuestionId" TEXT NOT NULL,
  "catalogHash" TEXT NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainedDas3hObservation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainedDas3hObservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "TrainedDas3hObservation_userId_catalogHash_occurredAt_idx" ON "TrainedDas3hObservation"("userId", "catalogHash", "occurredAt");
