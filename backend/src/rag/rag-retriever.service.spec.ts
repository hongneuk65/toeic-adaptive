import { jest } from '@jest/globals';
import { PrismaService } from '../prisma/prisma.service';
import { RagRetrieverService } from './rag-retriever.service';

describe('RagRetrieverService shared knowledge cache', () => {
  const chunks = [{ id: 1, title: 'Although', content: 'a'.repeat(5000), category: 'Grammar', part: 5, skillCode: 'GRAMMAR', keywords: ['although'], lessonId: null }];
  const db = {
    knowledgeChunk: { findMany: jest.fn<() => Promise<typeof chunks>>() },
    theoryLesson: { findMany: jest.fn<() => Promise<[]>>() },
  };
  let service: RagRetrieverService;
  beforeEach(() => {
    jest.resetAllMocks();
    db.knowledgeChunk.findMany.mockResolvedValue(chunks);
    db.theoryLesson.findMany.mockResolvedValue([]);
    service = new RagRetrieverService(db as unknown as PrismaService);
  });
  afterEach(() => jest.restoreAllMocks());

  it('shares in-flight reads across queries while ranking separately', async () => {
    let resolve!: (value: typeof chunks) => void;
    db.knowledgeChunk.findMany.mockImplementation(() => new Promise((done) => { resolve = done; }));
    const a = service.retrieveContext({ query: 'although', part: 5, skillCode: 'GRAMMAR' });
    const b = service.retrieveContext({ query: 'different', part: 5 });
    expect(db.knowledgeChunk.findMany).toHaveBeenCalledTimes(1);
    expect(db.theoryLesson.findMany).toHaveBeenCalledTimes(1);
    resolve(chunks);
    const [first, second] = await Promise.all([a, b]);
    expect(first[0].relevanceScore).toBeGreaterThan(second[0].relevanceScore);
    expect(first[0].content.length).toBe(2400);
  });

  it('expires after 60 seconds and isolates TOEIC parts', async () => {
    const clock = jest.spyOn(Date, 'now').mockReturnValue(0);
    await service.retrieveContext({ query: 'although', part: 5 });
    await service.retrieveContext({ query: 'another', part: 5 });
    expect(db.knowledgeChunk.findMany).toHaveBeenCalledTimes(1);
    await service.retrieveContext({ query: 'another', part: 6 });
    clock.mockReturnValue(60001);
    await service.retrieveContext({ query: 'although', part: 5 });
    expect(db.knowledgeChunk.findMany).toHaveBeenCalledTimes(3);
  });

  it('evicts failures so the next request can recover', async () => {
    db.knowledgeChunk.findMany.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(service.retrieveContext({ query: 'although' })).rejects.toThrow();
    expect(await service.retrieveContext({ query: 'although' })).toHaveLength(1);
    expect(db.knowledgeChunk.findMany).toHaveBeenCalledTimes(2);
  });
});