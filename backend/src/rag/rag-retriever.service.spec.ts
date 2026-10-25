import { jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { TutorKnowledgeService, knowledgeHash, ReviewableKnowledge } from './tutor-knowledge.service';
import { RagRetrieverService } from './rag-retriever.service';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';

const base: ReviewableKnowledge = { id: 1, title: 'Although and despite', content: 'Although introduces a clause.', part: 5, skillCode: 'P5_CONNECTORS_CONJ', category: 'Grammar', keywords: ['although'], lessonId: 3,
  reviewStatus: 'APPROVED', sourceUri: 'https://example.org/rule', sourceVersion: 'v1', reviewedAt: new Date(), reviewedBy: 'reviewer', approvedContentHash: null };
const row = { ...base, approvedContentHash: knowledgeHash(base) };
describe('Unified reviewed hybrid retrieval', () => {
  const db = { knowledgeChunk: { findMany: jest.fn<() => Promise<ReviewableKnowledge[]>>() } };
  const embeddings = { similarities: jest.fn<() => Promise<Map<number, number>>>() };
  let knowledge: TutorKnowledgeService;
  beforeEach(() => {
    jest.clearAllMocks(); db.knowledgeChunk.findMany.mockResolvedValue([row]); embeddings.similarities.mockResolvedValue(new Map());
    knowledge = new TutorKnowledgeService(db as unknown as PrismaService, embeddings as unknown as KnowledgeEmbeddingService);
  });
  it('does not return unrelated same-part documents or any revoked/edited source', async () => {
    expect(await knowledge.retrieve('quantum mechanics', [], 5)).toEqual([]);
    for (const invalid of [{ ...row, content: 'edited' }, { ...row, reviewStatus: 'REVOKED' }, { ...row, reviewedBy: null }]) {
      db.knowledgeChunk.findMany.mockResolvedValue([invalid]);
      expect(await knowledge.retrieve('although', [], 5)).toEqual([]);
    }
  });
  it('admits semantic paraphrases and retains server-owned provenance in general chat retrieval', async () => {
    embeddings.similarities.mockResolvedValue(new Map([[1, 0.85]]));
    const service = new RagRetrieverService(knowledge);
    expect((await service.retrieveContext({ query: 'hai ý trái ngược', part: 5 }))[0]).toMatchObject({ citationId: 'K1@v1', sourceUri: base.sourceUri, lessonId: 3 });
    expect(db.knowledgeChunk.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { part: 5, reviewStatus: 'APPROVED' } }));
  });
  it('takes approval revocations immediately without a public content cache', async () => {
    expect(await knowledge.retrieve('although', [], 5)).toHaveLength(1);
    db.knowledgeChunk.findMany.mockResolvedValue([{ ...row, reviewStatus: 'REVOKED' }]);
    expect(await knowledge.retrieve('although', [], 5)).toEqual([]);
    expect(db.knowledgeChunk.findMany).toHaveBeenCalledTimes(2);
  });
});
