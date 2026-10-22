import { Injectable } from '@nestjs/common';
import { TutorKnowledgeService } from './tutor-knowledge.service';

export interface RetrievedChunk {
  id: number; title: string; category: string; part: number; skillCode?: string | null;
  content: string; relevanceScore: number; sourceType: 'chunk' | 'lesson'; lessonId?: number | null;
  citationId?: string; sourceUri?: string; version?: string;
}
/** All public RAG entry points share the same approval and stale-index policy. */
@Injectable()
export class RagRetrieverService {
  constructor(private readonly knowledge: TutorKnowledgeService) {}
  async retrieveContext(params: { query: string; part?: number; skillCode?: string; topK?: number; signal?: AbortSignal; semantic?: boolean }): Promise<RetrievedChunk[]> {
    const sources = await this.knowledge.retrieve(params.query, params.skillCode ? [params.skillCode] : [], params.part, params.signal, params.topK, params.semantic);
    return sources.map((source, index) => ({ id: Number(source.id.match(/^K(\d+)/)?.[1]), title: source.title,
      category: source.category, part: params.part || 0, skillCode: params.skillCode, content: source.content,
      relevanceScore: 1 / (index + 1), sourceType: 'chunk', lessonId: source.lessonId,
      citationId: source.id, sourceUri: source.sourceUri, version: source.version }));
  }
}
