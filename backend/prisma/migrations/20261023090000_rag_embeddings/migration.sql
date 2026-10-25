CREATE TABLE "KnowledgeEmbedding" (
  "id" SERIAL NOT NULL,
  "knowledgeId" INTEGER NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "model" TEXT NOT NULL,
  "dimensions" INTEGER NOT NULL,
  "sourceHash" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "vector" DOUBLE PRECISION[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KnowledgeEmbedding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnowledgeEmbedding_dimensions_check" CHECK ("dimensions" > 0 AND cardinality("vector") = "dimensions"),
  CONSTRAINT "KnowledgeEmbedding_knowledgeId_fkey" FOREIGN KEY ("knowledgeId") REFERENCES "KnowledgeChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "KnowledgeEmbedding_knowledgeId_chunkIndex_model_key" ON "KnowledgeEmbedding"("knowledgeId", "chunkIndex", "model");
CREATE INDEX "KnowledgeEmbedding_model_knowledgeId_idx" ON "KnowledgeEmbedding"("model", "knowledgeId");
