import { ActivitiesService } from './activities.service';
import { MasteryService } from './mastery.service';
import { PrismaService } from '../prisma/prisma.service';
import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';

describe('cross-module activities', () => {
  const db = {
    theoryLesson: { findMany: jest.fn<any>() }, flashcardReview: { findMany: jest.fn<any>() },
    listeningAnswer: { findMany: jest.fn<any>() }, readingAttempt: { findMany: jest.fn<any>() }, readingArticle: { findMany: jest.fn<any>() }, readingVersion: { findMany: jest.fn<any>() },
    flashcardFolder: { findMany: jest.fn<any>() }, listeningSource: { findMany: jest.fn<any>() },
  };
  const mastery = { getUserMasteryProfile: jest.fn<any>() };
  const service = new ActivitiesService(db as unknown as PrismaService, mastery as unknown as MasteryService);
  beforeEach(() => {
    jest.resetAllMocks();
    Object.values(db).forEach(d => d.findMany.mockResolvedValue([]));
    mastery.getUserMasteryProfile.mockResolvedValue({ skills: [] });
  });
  const skill = (code = 'P5_PARTS_OF_SPEECH') => ({ skillId: 1, skillCode: code, skillName: 'Từ loại', masteryScore: .4, practiceCount: 12 });

  it('has explicit empty sections and never calls unassessed skills weak', async () => {
    mastery.getUserMasteryProfile.mockResolvedValue({ skills: [{ ...skill(), practiceCount: 0 }] });
    db.theoryLesson.findMany.mockResolvedValue([{ id: 8, title: 'Từ loại', part: 5, skillId: 1, skill: { code: 'P5_PARTS_OF_SPEECH' } }]);
    const result = await service.forUser(7);
    expect(result.learnerProfile.stage).toBe('unassessed');
    expect(result.sections.theory[0]).toMatchObject({ evidence: 'starter', priority: 'diagnostic' });
    expect(result.sections.theory[0].reason).not.toContain('yếu');
    expect(result.sections.vocabulary).toEqual([]);
  });

  it('selects an actual related theory lesson and guards broad legacy tags by topic', async () => {
    mastery.getUserMasteryProfile.mockResolvedValue({ skills: [skill()] });
    db.theoryLesson.findMany.mockResolvedValue([
      { id: 6, title: 'Liên từ', part: 5, skillId: 1, skill: { code: 'P5_PARTS_OF_SPEECH' } },
      { id: 8, title: 'Từ loại', part: 5, skillId: 1, skill: { code: 'P5_PARTS_OF_SPEECH' } },
    ]);
    expect((await service.forUser(7)).sections.theory).toEqual([expect.objectContaining({ href: '/theory?lesson=8', evidence: 'das3h' })]);
  });

  it('groups due accessible vocabulary and exposes no words, answers or owner data', async () => {
    const card = { word: 'meeting', meaning: 'cuộc họp', folderId: 4, folder: { name: 'Công việc' } };
    db.flashcardReview.findMany.mockResolvedValue([{
      card, dueAt: new Date('2020-01-01'), lastPracticedAt: new Date('2020-01-01'), recallWins: 1, recallLosses: 0,
      contentHash: createHash('sha256').update(JSON.stringify([card.word, card.meaning])).digest('hex'), schedulingSource: 'hlr-prior-experimental',
    }]);
    const result = await service.forUser(7);
    expect(result.sections.vocabulary[0]).toMatchObject({ href: '/flashcards/4', evidence: 'vocabulary-recall', priority: 'review' });
    expect(JSON.stringify(result)).not.toContain('meeting');
    expect(db.flashcardReview.findMany.mock.calls[0][0].where).toMatchObject({ userId: 7, card: { folder: { OR: [{ userId: 7 }, { private: false }] } } });
  });

  it('uses latest listening answer per unit, with minimum evidence and native score wording', async () => {
    const answer = (unitId: number, score: number) => ({ unitId, score, sessionId: 2, session: { sourceId: 9, source: { title: 'Office talk' } } });
    db.listeningAnswer.findMany.mockResolvedValue([answer(1, .2), answer(2, .3), answer(3, .4), answer(1, 1)]);
    const result = await service.forUser(7);
    expect(result.sections.listening[0]).toMatchObject({ href: '/listening?session=2', evidence: 'listening-practice' });
    expect(result.sections.listening[0].reason).toContain('30%');
    const query = db.listeningAnswer.findMany.mock.calls[0][0];
    expect(query.where.session.userId).toBe(7);
    expect(query.where.mode.in).not.toContain('SPEAK');
    expect(query.where.session.source.deletedAt).toBeNull();
  });

  it('does not label a single low listening answer as sufficient weakness evidence', async () => {
    db.listeningAnswer.findMany.mockResolvedValue([{ unitId: 1, score: .1, sessionId: 2, session: { sourceId: 9, source: { title: 'Talk' } } }]);
    expect((await service.forUser(7)).sections.listening).toEqual([]);
  });

  it('matches reading task types from native errors and uses only the selected article version', async () => {
    const qs = [0, 1, 2].map(() => ({ type: 'INFERENCE', answer: 0 }));
    db.readingAttempt.findMany.mockResolvedValue([{ versionId: 3, answers: { '0': { selected: 1 }, '1': { selected: 1 }, '2': { selected: 1 } }, version: { articleId: 2, questions: qs } }]);
    db.readingArticle.findMany.mockResolvedValue([
      { id: 4, ownerId: null, publishedVersionId: 5, versions: [{ id: 5, title: 'Notice', questions: [{ type: 'DETAIL', answer: 1 }] }, { id: 6, title: 'Hidden draft', questions: qs }] },
      { id: 7, ownerId: null, publishedVersionId: 8, versions: [{ id: 8, title: 'Email', questions: qs }] },
    ]);
    db.readingVersion.findMany.mockResolvedValue([
      { id: 5, articleId: 4, title: 'Notice', questions: [{ type: 'DETAIL', answer: 1 }] },
      { id: 8, articleId: 7, title: 'Email', questions: qs },
    ]);
    const result = await service.forUser(7);
    expect(result.sections.reading[0]).toMatchObject({ href: '/reading?article=7', evidence: 'reading-practice' });
    expect(result.sections.reading[1]).toMatchObject({ href: '/reading?article=4', evidence: 'starter' });
    expect(JSON.stringify(result)).not.toContain('Hidden draft');
    expect(JSON.stringify(result)).not.toContain('answer');
    expect(db.readingVersion.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [5, 8] } }, take: 100 }));
  });

  it('uses DAS3H reading evidence even when native reading history is empty', async () => {
    mastery.getUserMasteryProfile.mockResolvedValue({ skills: [skill('P7A_MAIN_PURPOSE')] });
    db.readingArticle.findMany.mockResolvedValue([{ id: 7, ownerId: 7, currentVersionId: 8, versions: [{ id: 8, title: 'Email', questions: [{ type: 'PURPOSE', answer: 0 }] }] }]);
    db.readingVersion.findMany.mockResolvedValue([{ id: 8, articleId: 7, title: 'Email', questions: [{ type: 'PURPOSE', answer: 0 }] }]);
    expect((await service.forUser(7)).sections.reading[0]).toMatchObject({ href: '/reading?article=7', evidence: 'das3h' });
  });

  it('offers real starters in all modules before module history exists', async () => {
    db.theoryLesson.findMany.mockResolvedValue([{ id: 8, title: 'Từ loại', part: 5, skillId: 1, skill: { code: 'P5_PARTS_OF_SPEECH' } }]);
    db.flashcardFolder.findMany.mockResolvedValue([{ id: 4, name: 'Work', userId: 7, _count: { flashcards: 12 } }]);
    db.listeningSource.findMany.mockResolvedValue([{ id: 9, title: 'Talk', transcripts: [{ units: [{ start: 0, end: 8 }] }] }]);
    db.readingArticle.findMany.mockResolvedValue([{ id: 7, ownerId: null, publishedVersionId: 8 }]);
    db.readingVersion.findMany.mockResolvedValue([{ id: 8, articleId: 7, title: 'Email', difficulty: 'EASY', questions: [{ type: 'DETAIL', answer: 0 }] }]);
    const result = await service.forUser(7);
    expect(result.learnerProfile.stage).toBe('unassessed');
    for (const section of Object.values(result.sections)) {
      expect(section[0]).toMatchObject({ priority: 'diagnostic', evidence: 'starter' });
      expect(section[0].reason).not.toContain('yếu');
    }
    expect(result.sections.listening[0].href).toBe('/listening?source=9');
    expect(db.flashcardFolder.findMany.mock.calls[0][0].where.OR).toEqual([{ userId: 7 }, { private: false }]);
    expect(db.listeningSource.findMany.mock.calls[0][0].where).toMatchObject({ deletedAt: null, OR: [{ ownerId: 7 }, { published: true }] });
  });

  it('prefers declared Reading difficulty from observed reading skills, not grammar-only readiness', async () => {
    mastery.getUserMasteryProfile.mockResolvedValue({ skills: [
      { ...skill('P7A_MAIN_PURPOSE'), part: 7, masteryScore: .9 },
      { ...skill('P7A_FACT_NEGATIVE_FACT'), skillId: 2, part: 7, masteryScore: .9 },
    ] });
    db.readingArticle.findMany.mockResolvedValue([{ id: 7, ownerId: null, publishedVersionId: 8 }, { id: 9, ownerId: null, publishedVersionId: 10 }]);
    db.readingVersion.findMany.mockResolvedValue([
      { id: 8, articleId: 7, title: 'Easy', difficulty: 'EASY', questions: [{ type: 'DETAIL', answer: 0 }] },
      { id: 10, articleId: 9, title: 'Hard', difficulty: 'HARD', questions: [{ type: 'DETAIL', answer: 0 }] },
    ]);
    expect((await service.forUser(7)).sections.reading[0].href).toBe('/reading?article=9');
    mastery.getUserMasteryProfile.mockResolvedValue({ skills: [
      { ...skill(), part: 5, masteryScore: .9 },
      { ...skill('P5_VERB_TENSES_VOICE'), skillId: 2, part: 5, masteryScore: .9 },
    ] });
    // Grammar-only Part5 evidence must not be treated as passage comprehension readiness.
    expect((await service.forUser(7)).sections.reading[0].href).toBe('/reading?article=7');
  });
});
