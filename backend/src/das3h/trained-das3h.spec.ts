import { randomUUID } from 'node:crypto';
import { writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { jest } from '@jest/globals';
import type { Prisma } from '@prisma/client';
import { TrainedDas3h, TrainedModel, ModelQuestion, questionFingerprint, modelProbability, validateModel, WINDOWS_MS } from './trained-das3h';

const question: ModelQuestion = { id: 11, part: 5, content: 'A _____ report.', optionA: 'clear', optionB: 'clearly', optionC: 'clears', optionD: 'clearing', correctAnswer: 'A', explanation: '[santa-ednet:q11]' };
function fixture(): TrainedModel {
  return { schemaVersion: 1, featureContract: 'own-das3h-d0-cumulative-v1', version: 'own-das3h-1234567890abcdef', intercept: -.4,
    windowsMs: WINDOWS_MS, questions: { q11: { bias: .1, tags: ['OWN_A', 'OWN_B'], part: 5, correctAnswer: 'A' } },
    skills: { OWN_A: { bias: .2, wins: [.1,.2,.3,.4,.5], attempts: [-.1,-.1,-.1,-.1,-.1] }, OWN_B: { bias: -.3, wins: [.3,.2,.1,.2,.3], attempts: [-.2,-.2,-.2,-.2,-.2] } },
    applicationBridge: { q11: questionFingerprint(question) }, releaseGatePassed: true, sourceHashes: { catalog: 'catalog-fixture' }, metrics: {}, cohort: {}, mappingStatus: 'research_candidate_not_final' };
}
describe('fitted OWN DAS3H inference contract', () => {
  const originalPath = process.env.DAS3H_MODEL_PATH;
  let path: string;
  const now = new Date('2026-10-19T00:00:00Z');
  const db = {
    question: { findMany: jest.fn<any>(), findUnique: jest.fn<any>() },
    trainedDas3hState: { findUnique: jest.fn<any>(), upsert: jest.fn<any>() },
    trainedDas3hObservation: { findMany: jest.fn<any>(), create: jest.fn<any>() },
  };
  beforeEach(() => {
    jest.resetAllMocks();
    path = join(tmpdir(), `das3h-test-${randomUUID()}.json`);
    writeFileSync(path, JSON.stringify(fixture())); process.env.DAS3H_MODEL_PATH = path;
    db.question.findMany.mockResolvedValue([question]); db.question.findUnique.mockResolvedValue(question);
    db.trainedDas3hState.findUnique.mockResolvedValue(null); db.trainedDas3hObservation.findMany.mockResolvedValue([]);
  });
  afterEach(() => { unlinkSync(path); if (originalPath === undefined) delete process.env.DAS3H_MODEL_PATH; else process.env.DAS3H_MODEL_PATH = originalPath; });
  it('sums all OWN tags, uses attempts rather than losses, and includes the intercept/item bias', () => {
    const features = new Map([['OWN_A', { wins: [Math.log(2),0,0,0,0], attempts: [Math.log(3),0,0,0,0] }]]);
    const z = -.4+.1+.2-.3+.1*Math.log(2)-.1*Math.log(3);
    expect(modelProbability(fixture(), 'q11', features)).toBeCloseTo(1/(1+Math.exp(-z)), 14);
  });
  it('uses cumulative windows with strict lower bounds and never sees same-time/future outcomes', async () => {
    db.trainedDas3hObservation.findMany.mockResolvedValue([
      { sourceQuestionId: 'q11', isCorrect: true, occurredAt: new Date(now.getTime()-1000) },
      { sourceQuestionId: 'q11', isCorrect: false, occurredAt: new Date(now.getTime()-3600000) },
      { sourceQuestionId: 'q11', isCorrect: true, occurredAt: now },
      { sourceQuestionId: 'q11', isCorrect: true, occurredAt: new Date(now.getTime()+1) },
    ]);
    const f = { wins: Array(5).fill(Math.log(2)), attempts: [Math.log(3),Math.log(3),Math.log(3),Math.log(3),Math.log(2)] };
    const scores = await new TrainedDas3h(db as unknown as Prisma.TransactionClient).predictMany(1,[11],now);
    expect(scores.get(11)).toBeCloseTo(modelProbability(fixture(),'q11',new Map([['OWN_A',f],['OWN_B',f]])),14);
    expect(db.trainedDas3hObservation.findMany.mock.calls[0][0].where.occurredAt.lt).toEqual(now);
  });
  it('falls back for edited questions instead of applying the old item coefficients to changed content', async () => {
    db.question.findMany.mockResolvedValue([{ ...question, optionA: 'changed' }]);
    expect((await new TrainedDas3h(db as unknown as Prisma.TransactionClient).predictMany(1,[11],now)).size).toBe(0);
    expect(db.trainedDas3hObservation.findMany).not.toHaveBeenCalled();
  });
  it('writes one OWN observation without adding an unfitted learner intercept', async () => {
    await new TrainedDas3h(db as unknown as Prisma.TransactionClient).recordAbility(1,11,true,now,'answer-id');
    expect(db.trainedDas3hObservation.create).toHaveBeenCalledTimes(1);
    expect(db.trainedDas3hObservation.create.mock.calls[0][0].data).toEqual({ id:'answer-id', userId:1, sourceQuestionId:'q11', catalogHash:'catalog-fixture', isCorrect:true, occurredAt:now });
    expect(db.trainedDas3hState.upsert).not.toHaveBeenCalled();
  });
  it('ignores old online ability even when it contains same-time or future outcomes', async () => {
    db.trainedDas3hState.findUnique.mockResolvedValue({ ability: 3.5, updatedAt: new Date('2030-01-01') });
    const scores = await new TrainedDas3h(db as unknown as Prisma.TransactionClient).predictMany(1, [11], now);
    expect(scores.get(11)).toBeCloseTo(modelProbability(fixture(), 'q11', new Map()), 14);
    expect(db.trainedDas3hState.findUnique).not.toHaveBeenCalled();
  });
  it('refuses trained coefficients after media or passage invalidation', async () => {
    db.question.findMany.mockResolvedValue([{ ...question, stimulus: { _trainedItemInvalidated: true } }]);
    expect((await new TrainedDas3h(db as unknown as Prisma.TransactionClient).predictMany(1, [11], now)).size).toBe(0);
    db.question.findUnique.mockResolvedValue({ ...question, stimulus: { _trainedItemInvalidated: true } });
    await new TrainedDas3h(db as unknown as Prisma.TransactionClient).recordAbility(1, 11, true, now, 'invalidated');
    expect(db.trainedDas3hObservation.create).not.toHaveBeenCalled();
  });
  it('rejects a different feature formula, bad coefficients, and an unreleased artifact', () => {
    expect(()=>validateModel({ ...fixture(), featureContract:'disjoint-wins-losses' })).toThrow();
    expect(()=>validateModel({ ...fixture(), intercept:NaN })).toThrow();
    expect(()=>validateModel({ ...fixture(), releaseGatePassed:false })).toThrow();
  });
  it('can be disabled without querying learner/model tables', async () => {
    delete process.env.DAS3H_MODEL_PATH;
    expect(new TrainedDas3h(db as unknown as Prisma.TransactionClient).status().mode).toBe('legacy-heuristic');
    expect((await new TrainedDas3h(db as unknown as Prisma.TransactionClient).predictMany(1,[11],now)).size).toBe(0);
    expect(db.question.findMany).not.toHaveBeenCalled();
  });
});
