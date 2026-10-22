import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import { CHUNK_CONTRACT, cosine, splitKnowledge } from './hybrid-retrieval';

@Injectable()
export class KnowledgeEmbeddingService {
  private readonly logger = new Logger(KnowledgeEmbeddingService.name);
  private unavailableUntil = 0;
  constructor(private readonly prisma: PrismaService) {}
  get model() { return process.env.RAG_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001'; }
  get dimensions() { return 768; }
  get identity() { return `gemini:${this.model}:${this.dimensions}:${CHUNK_CONTRACT}`; }
  get enabled() { return process.env.RAG_EMBEDDING_ENABLED === 'true' && !!process.env.GEMINI_API_KEY?.trim(); }
  async embed(text: string, task: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT', signal?: AbortSignal): Promise<number[]> {
    if (!this.enabled) throw new Error('Embedding is disabled or GEMINI_API_KEY is missing');
    if (!/^[a-zA-Z0-9.-]+$/.test(this.model)) throw new Error('Invalid embedding model');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:embedContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY!.trim() },
      body: JSON.stringify({ model: `models/${this.model}`, content: { parts: [{ text: text.slice(0, 8000) }] }, taskType: task, outputDimensionality: this.dimensions }),
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(8000)]) : AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Embedding HTTP ${response.status}`);
    const data = await response.json() as { embedding?: { values?: number[] } };
    const vector = data.embedding?.values;
    if (!vector || vector.length !== this.dimensions || !vector.every(Number.isFinite) || !vector.some(value => value !== 0)) throw new Error('Invalid embedding vector');
    return vector;
  }
  async similarities(query: string, sources: { id: number; approvedContentHash: string | null }[], signal?: AbortSignal) {
    const scores = new Map<number, number>();
    if (!this.enabled || !sources.length || this.unavailableUntil > Date.now()) return scores;
    try {
      const hashes = new Map(sources.map(source => [source.id, source.approvedContentHash]));
      const vectors = await this.prisma.knowledgeEmbedding.findMany({ where: { knowledgeId: { in: sources.map(source => source.id) }, model: this.identity, dimensions: this.dimensions } });
      const current = vectors.filter(row => row.sourceHash === hashes.get(row.knowledgeId));
      if (!current.length) return scores; // Never pay to embed queries without a current index.
      const vector = await this.embed(query, 'RETRIEVAL_QUERY', signal);
      for (const row of current) scores.set(row.knowledgeId, Math.max(scores.get(row.knowledgeId) ?? -1, cosine(vector, row.vector)));
    } catch {
      signal?.throwIfAborted();
      this.unavailableUntil = Date.now() + 30000;
      this.logger.warn('Semantic retrieval unavailable; using reviewed lexical sources.');
    }
    return scores;
  }
  async index(row: { id: number; title: string; content: string; approvedContentHash: string }) {
    const parts = splitKnowledge(row.title, row.content);
    const records: Prisma.KnowledgeEmbeddingCreateManyInput[] = [];
    for (const [chunkIndex, content] of parts.entries()) records.push({ knowledgeId: row.id, chunkIndex, content, sourceHash: row.approvedContentHash, model: this.identity, dimensions: this.dimensions, vector: await this.embed(content, 'RETRIEVAL_DOCUMENT') });
    // Serialize with review/edit and revalidate before replacing the index.
    await this.prisma.$transaction(async tx => {
      const rows = await tx.$queryRaw<{ approvedContentHash: string | null; reviewStatus: string }[]>`SELECT "approvedContentHash", "reviewStatus" FROM "KnowledgeChunk" WHERE id = ${row.id} FOR UPDATE`;
      if (rows[0]?.reviewStatus !== 'APPROVED' || rows[0]?.approvedContentHash !== row.approvedContentHash) throw new Error('Knowledge changed during indexing');
      await tx.knowledgeEmbedding.deleteMany({ where: { knowledgeId: row.id } });
      await tx.knowledgeEmbedding.createMany({ data: records });
    });
    return records.length;
  }
}
