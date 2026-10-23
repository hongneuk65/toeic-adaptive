import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { ReadingAiService } from './reading-ai.service';
import { ReadingService } from './reading.service';
import { validateQuestions } from './reading-core';

const text = 'Original English source information '.repeat(45);
const questions = [{ type: 'DETAIL', prompt: 'What is specified?', options: ['First', 'Second', 'Third', 'Fourth'], answer: 0, explanation: 'Original source answer', evidenceRequired: false, evidence: [] }];
function setup(origin = 'CRAWL') {
  const version = { id: 10, articleId: 1, origin, text, questions };
  const article = { id: 1, currentVersionId: 10, versions: [version] };
  const prisma = {
    readingArticle: { findFirst: jest.fn().mockResolvedValue(article), update: jest.fn() },
    readingVersion: { findFirst: jest.fn().mockResolvedValue(version), aggregate: jest.fn().mockResolvedValue({ _max: { revision: 1 } }), create: jest.fn().mockImplementation(({ data }) => ({ id: 11, ...data })), update: jest.fn().mockResolvedValue({ reviewed: true }) },
    $executeRaw: jest.fn(), $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(callback => callback(prisma));
  return { prisma, service: new ReadingService(prisma as unknown as PrismaService, {} as Queue, {} as ReadingAiService) };
}
describe('source-aware reading admin validation', () => {
  it('keeps strict MAIN and evidence validation for new/AI questions', () => {
    expect(() => validateQuestions(text, questions)).toThrow();
    expect(() => validateQuestions(text, [{ ...questions[0], type: 'MAIN' }])).toThrow();
    expect(() => validateQuestions(text, questions, 5, { sourceCrawl: true })).not.toThrow();
    expect(() => validateQuestions(text, [{ ...questions[0], evidenceRequired: true }], 5, { sourceCrawl: true })).toThrow();
  });
  it('allows existing CRAWL edits and preserves persisted provenance', async () => {
    const { service, prisma } = setup();
    const result = await service.draft(1, { title: 'Updated', topic: 'Business', text, kind: 'EMAIL', difficulty: 'MEDIUM', questions }, 1);
    expect(result.version.origin).toBe('CRAWL');
    expect(prisma.readingVersion.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ origin: 'CRAWL', questions }) }));
  });
  it('does not carry generated task annotations into a manually changed revision', async () => {
    const { service } = setup();
    const annotated = questions.map(q => ({ ...q, learning: { level: 'REMEMBER', objective: 'Old AI objective', sourceCardIds: ['source-1'] } }));
    const result = await service.draft(1, { title: 'Edited', topic: 'Business', text, kind: 'EMAIL', difficulty: 'MEDIUM', questions: annotated }, 1);
    expect((result.version.questions as unknown as object[])[0]).not.toHaveProperty('learning');
    expect(result.version.origin).toBe('CRAWL');
  });
  it('accepts short authentic source notices but rejects empty source and short SYSTEM text', async () => {
    const crawl = setup();
    await expect(crawl.service.draft(1, { title: 'Notice', topic: 'Business', text: 'Office closed Friday.', kind: 'NOTICE', difficulty: 'EASY', questions }, 1)).resolves.toMatchObject({ articleId: 1 });
    await expect(crawl.service.draft(1, { title: 'Notice', topic: 'Business', text: ' ', kind: 'NOTICE', difficulty: 'EASY', questions }, 1)).rejects.toBeInstanceOf(BadRequestException);
    const system = setup('SYSTEM');
    await expect(system.service.draft(1, { title: 'Notice', topic: 'Business', text: 'Office closed Friday.', kind: 'NOTICE', difficulty: 'EASY', questions }, 1)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('does not relax validation for SYSTEM edits or forged source request data', async () => {
    const { service } = setup('SYSTEM');
    await expect(service.draft(1, { title: 'Updated', topic: 'Business', text, kind: 'EMAIL', difficulty: 'MEDIUM', questions, origin: 'CRAWL' } as never, 1)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('reviews CRAWL original questions but returns 400 for invalid SYSTEM review', async () => {
    const crawl = setup();
    await expect(crawl.service.review(1, 10)).resolves.toEqual({ reviewed: true });
    const system = setup('SYSTEM');
    await expect(system.service.review(1, 10)).rejects.toBeInstanceOf(BadRequestException);
    expect(system.prisma.readingVersion.update).not.toHaveBeenCalled();
  });
});
