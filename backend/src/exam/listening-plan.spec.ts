import { buildListeningPlan } from './listening-plan';

describe('measured listening schedule', () => {
  const rows = [{ id: 1, part: 1, audioUrl: '/one', stimulus: { audioDurationSeconds: 16.171 } },
    ...[2,3,4].map(id => ({ id, part: 3, audioUrl: '/conversation', stimulus: { audioDurationSeconds: 45.873 } }))];
  it('counts shared audio once and fills FULL to exactly 45 minutes', () => {
    const plan = buildListeningPlan('FULL', rows)!;
    expect(plan.audioSeconds).toBe(62.044);
    expect(plan.targetSeconds).toBe(2700);
    expect(plan.groups).toHaveLength(2);
    expect(Math.round(plan.groups.reduce((sum,g) => sum + g.audioSeconds + g.restSeconds, 0) * 1000)).toBe(2700000);
    expect(Math.abs(plan.groups[1].restSeconds - 3 * plan.groups[0].restSeconds)).toBeLessThan(.003);
  });
  it('scales MINI by the actual number of listening questions', () => {
    expect(buildListeningPlan('MINI', rows)?.targetSeconds).toBe(108);
  });
  it('custom parts keep enough time for long clips plus five answer seconds per question', () => {
    const plan = buildListeningPlan('CUSTOM', [{ id: 1, part: 1, stimulus: { audioDurationSeconds: 40 } }])!;
    expect(plan.targetSeconds).toBe(45);
    expect(plan.restSeconds).toBe(5);
    expect(buildListeningPlan('CUSTOM', rows)?.targetSeconds).toBe(108);
  });
  it('does not fabricate durations for legacy attempts or Reading-only sessions', () => {
    expect(buildListeningPlan('FULL', [{ id: 1, part: 1 }])).toBeUndefined();
    expect(buildListeningPlan('PART_5', [{ id: 1, part: 5 }])).toBeUndefined();
  });
  it('rejects clips that cannot fit the section rather than speeding up the recording', () => {
    expect(() => buildListeningPlan('FULL', [{ id:1, part:1, stimulus:{audioDurationSeconds:2701} }])).toThrow('Tổng audio');
  });
});
