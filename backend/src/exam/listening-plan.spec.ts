import { buildListeningPlan } from './listening-plan';

describe('measured listening schedule', () => {
  const rows = [{ id: 1, part: 1, audioUrl: '/one', stimulus: { audioDurationSeconds: 16.171 } },
    ...[2,3,4].map(id => ({ id, part: 3, audioUrl: '/conversation', stimulus: { audioDurationSeconds: 45.873 } }))];
  it('counts shared audio once and uses part-specific response windows', () => {
    const plan = buildListeningPlan('FULL', rows)!;
    expect(plan.audioSeconds).toBe(62.044);
    expect(plan.targetSeconds).toBe(91.044);
    expect(plan.groups).toHaveLength(2);
    expect(plan.groups.map(g => g.restSeconds)).toEqual([5, 24]);
    expect(plan.pacingVersion).toBe('part-response-v1');
  });
  it('keeps the same speech and response pace in MINI and CUSTOM', () => {
    expect(buildListeningPlan('MINI', rows)?.targetSeconds).toBe(91.044);
    expect(buildListeningPlan('CUSTOM', rows)?.targetSeconds).toBe(91.044);
  });
  it('custom parts keep enough time for long clips plus five answer seconds per question', () => {
    const plan = buildListeningPlan('CUSTOM', [{ id: 1, part: 1, audioUrl: '/one', stimulus: { audioDurationSeconds: 40 } }])!;
    expect(plan.targetSeconds).toBe(45);
    expect(plan.restSeconds).toBe(5);
    expect(buildListeningPlan('CUSTOM', rows)?.targetSeconds).toBe(91.044);
  });
  it('does not fabricate durations for legacy attempts or Reading-only sessions', () => {
    expect(buildListeningPlan('FULL', [{ id: 1, part: 1 }])).toBeUndefined();
    expect(buildListeningPlan('PART_5', [{ id: 1, part: 5 }])).toBeUndefined();
  });
  it('subtracts measured trailing silence once per shared clip and never produces negative rest', () => {
    const questions = rows.map(q => ({...q, stimulus: {...q.stimulus, audioTrailingSilenceSeconds: 1.125}}));
    const plan = buildListeningPlan('FULL', questions)!;
    expect(plan.groups.map(g => g.restSeconds)).toEqual([3.875,22.875]);
    expect(plan.targetSeconds).toBe(88.794);
    expect(buildListeningPlan('CUSTOM', [{id:1,part:2,audioUrl:'/one',stimulus:{audioDurationSeconds:20,audioTrailingSilenceSeconds:7}}])?.groups[0].restSeconds).toBe(0);
  });
  it('uses longer pauses only from reviewed timing, never from a graphic prompt alone', () => {
    const questions = rows.map(q => ({...q, content:q.id===4 ? 'Look at the graphic. Which room is available?' : 'What does the man offer?'}));
    expect(buildListeningPlan('FULL', questions)?.groups[1].restSeconds).toBe(24);
    const reviewed = questions.map(q => q.id === 4 ? {...q,stimulus:{...q.stimulus,audioQuestionResponseSeconds:12}} : q);
    expect(buildListeningPlan('FULL', reviewed)?.groups[1].restSeconds).toBe(28);
  });
  it('ignores corrupt silence metadata and rejects inconsistent shared durations', () => {
    for (const tail of [-1, NaN, Infinity, 16.171, 100, '5']) {
      expect(buildListeningPlan('CUSTOM', [{...rows[0],stimulus:{audioDurationSeconds:16.171,audioTrailingSilenceSeconds:tail}}])?.restSeconds).toBe(5);
    }
    expect(() => buildListeningPlan('FULL', [rows[1], {...rows[2],stimulus:{audioDurationSeconds:50}}])).toThrow('không đồng nhất');
  });
  it('does not merge separate stimulus groups that happen to reuse a recording', () => {
    const questions = rows.slice(1).map(q => ({...q,stimulus:{...q.stimulus,groupId:String(q.id)}}));
    expect(buildListeningPlan('FULL', questions)?.groups).toHaveLength(3);
  });
});
