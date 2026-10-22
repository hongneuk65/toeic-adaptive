import { jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { KnowledgeEmbeddingService } from './knowledge-embedding.service';
describe('Embedding contract and graceful degradation', () => {
  const db = { knowledgeEmbedding: { findMany: jest.fn<() => Promise<{ knowledgeId: number; sourceHash: string; vector: number[] }[]>>() } };
  let service: KnowledgeEmbeddingService;
  let env: NodeJS.ProcessEnv;
  beforeEach(() => { env = { ...process.env }; process.env.RAG_EMBEDDING_ENABLED = 'true'; process.env.GEMINI_API_KEY = 'not-real'; service = new KnowledgeEmbeddingService(db as unknown as PrismaService); jest.clearAllMocks(); });
  afterEach(() => { process.env = env; jest.restoreAllMocks(); });
  it('uses retrieval task types and never leaks the key in the URL', async () => {
    const request = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ embedding: { values: Array(768).fill(0.1) } })));
    await service.embed('hello', 'RETRIEVAL_QUERY');
    expect(String(request.mock.calls[0][0])).not.toContain('not-real');
    expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toMatchObject({ taskType: 'RETRIEVAL_QUERY', outputDimensionality: 768 });
  });
  it('never embeds a query when all indexed source hashes are stale', async () => {
    db.knowledgeEmbedding.findMany.mockResolvedValue([{ knowledgeId: 1, sourceHash: 'old', vector: [1] }]);
    const request = jest.spyOn(globalThis, 'fetch');
    expect((await service.similarities('query', [{ id: 1, approvedContentHash: 'new' }])).size).toBe(0);
    expect(request).not.toHaveBeenCalled();
  });
  it('keeps lexical retrieval usable on quota/network/invalid vector errors', async () => {
    db.knowledgeEmbedding.findMany.mockResolvedValue([{ knowledgeId: 1, sourceHash: 'current', vector: [1] }]);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 429 }));
    expect((await service.similarities('query', [{ id: 1, approvedContentHash: 'current' }])).size).toBe(0);
  });
  it('propagates cancellation rather than converting it to a lexical success', async () => {
    db.knowledgeEmbedding.findMany.mockResolvedValue([{ knowledgeId: 1, sourceHash: 'current', vector: [1] }]);
    const controller = new AbortController(); controller.abort();
    jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('abort'));
    await expect(service.similarities('query', [{ id: 1, approvedContentHash: 'current' }], controller.signal)).rejects.toThrow();
  });
});
