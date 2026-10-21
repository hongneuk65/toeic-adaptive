import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';

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
export function approvedSources(rows: ReviewableKnowledge[], query: string, skillCodes: string[], part: number): TutorSource[] {
  const normalized = query.toLowerCase();
  return rows.filter(row => {
    if (row.reviewStatus !== 'APPROVED' || !row.reviewedAt || !row.reviewedBy?.trim() || !row.sourceVersion?.trim() || !row.sourceUri?.startsWith('https://')) return false;
    if (row.part !== part || row.approvedContentHash !== knowledgeHash(row)) return false;
    return (row.skillCode && skillCodes.includes(row.skillCode)) || row.keywords.some(keyword => keyword.trim().length >= 3 && normalized.includes(keyword.toLowerCase().trim()));
  }).sort((a, b) => Number(skillCodes.includes(b.skillCode || '')) - Number(skillCodes.includes(a.skillCode || '')) || a.id - b.id).slice(0, 3).map(row => ({
    id: `K${row.id}@${row.sourceVersion}`, title: row.title, category: row.category, sourceType: 'approved_chunk', lessonId: row.lessonId,
    sourceUri: row.sourceUri!, version: row.sourceVersion!, contentHash: row.approvedContentHash!, content: row.content.slice(0, 6000),
  }));
}

@Injectable()
export class TutorKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}
  async retrieve(query: string, skillCodes: string[], part: number) {
    // No approval cache: revocations and content edits take effect on the next request.
    const rows = await this.prisma.knowledgeChunk.findMany({ where: { part, reviewStatus: 'APPROVED' }, orderBy: { id: 'asc' }, take: 1000 });
    return approvedSources(rows, query, skillCodes, part);
  }
}
