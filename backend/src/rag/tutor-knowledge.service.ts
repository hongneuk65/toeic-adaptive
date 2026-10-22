import { Injectable, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';
import { rankHybrid } from './hybrid-retrieval';

export interface ReviewableKnowledge {
  id: number; title: string; content: string; part: number; skillCode: string | null;
  category: string; keywords: string[]; lessonId: number | null;
  sourceUri: string | null; sourceVersion: string | null;
  reviewStatus: string; reviewedAt: Date | null; reviewedBy: string | null; approvedContentHash: string | null;
}
export interface TutorSource { id: string; title: string; category: string; sourceType: 'approved_chunk'; lessonId: number | null; sourceUri: string; version: string; contentHash: string; content: string; }
export function knowledgeHash(row: Pick<ReviewableKnowledge, 'title' | 'content' | 'part' | 'skillCode' | 'category' | 'keywords' | 'lessonId' | 'sourceUri' | 'sourceVersion'>) {
  return createHash('sha256').update(JSON.stringify([row.title, row.content, row.part, row.skillCode, row.category, row.keywords, row.lessonId, row.sourceUri, row.sourceVersion])).digest('hex');
}
export function isApprovedKnowledge(row: ReviewableKnowledge): boolean {
  let url: URL;
  try { url = new URL(row.sourceUri || ''); } catch { return false; }
  return row.reviewStatus === 'APPROVED' && !!row.reviewedAt && !!row.reviewedBy?.trim()
    && !!row.sourceVersion?.trim() && url.protocol === 'https:' && !url.username && !url.password
    && row.approvedContentHash === knowledgeHash(row);
}
export function approvedSources(rows: ReviewableKnowledge[], query: string, skillCodes: string[], part: number): TutorSource[] {
  const normalized = query.toLowerCase();
  return rows.filter(row => {
    if (!isApprovedKnowledge(row)) return false;
    if (row.part !== part || row.approvedContentHash !== knowledgeHash(row)) return false;
    return (row.skillCode && skillCodes.includes(row.skillCode)) || row.keywords.some(keyword => keyword.trim().length >= 3 && normalized.includes(keyword.toLowerCase().trim()));
  }).sort((a, b) => Number(skillCodes.includes(b.skillCode || '')) - Number(skillCodes.includes(a.skillCode || '')) || a.id - b.id).slice(0, 3).map(row => ({
    id: `K${row.id}@${row.sourceVersion}`, title: row.title, category: row.category, sourceType: 'approved_chunk', lessonId: row.lessonId,
    sourceUri: row.sourceUri!, version: row.sourceVersion!, contentHash: row.approvedContentHash!, content: row.content.slice(0, 6000),
  }));
}

@Injectable()
export class TutorKnowledgeService {
  constructor(private readonly prisma: PrismaService, @Optional() private readonly embeddings?: KnowledgeEmbeddingService) {}
  async retrieve(query: string, skillCodes: string[], part?: number, signal?: AbortSignal, topK = 3, semantic = true) {
    // No approval cache: revocations and content edits take effect on the next request.
    const rows = await this.prisma.knowledgeChunk.findMany({ where: { ...(part ? { part } : {}), reviewStatus: 'APPROVED' }, orderBy: { id: 'asc' }, take: 1000 });
    const approved = rows.filter(isApprovedKnowledge);
    const scores = semantic ? await this.embeddings?.similarities(query, approved, signal) : undefined;
    signal?.throwIfAborted();
    return rankHybrid(approved, query, skillCodes, scores, Math.max(1, Math.min(5, topK))).map(({ row }) => {
      const source = approved.find(source => source.id === row.id)!;
      return { id: `K${source.id}@${source.sourceVersion}`, title: source.title, category: source.category, sourceType: 'approved_chunk' as const,
        lessonId: source.lessonId, sourceUri: source.sourceUri!, version: source.sourceVersion!, contentHash: source.approvedContentHash!, content: source.content.slice(0, 6000) };
    });
  }
}
