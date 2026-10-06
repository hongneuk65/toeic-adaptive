import { cloze, gradeText, mergeCues, normalize, parseSubtitles, youtubeId } from './listening-core';

describe('Listening core', () => {
  it('validates YouTube hosts and IDs, including shorts and short links', () => {
    for (const url of ['https://youtu.be/dQw4w9WgXcQ?t=5', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com/shorts/dQw4w9WgXcQ']) expect(youtubeId(url)).toBe('dQw4w9WgXcQ');
    for (const url of ['https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ', 'file:///watch?v=dQw4w9WgXcQ', 'https://youtube.com/watch?v=123']) expect(() => youtubeId(url)).toThrow();
  });
  it('parses SRT/VTT and merges subtitle lines preserving start/end', () => {
    const cues = parseSubtitles('WEBVTT\n\n00:01.000 --> 00:02.000\nPlease bring\n\n00:02.000 --> 00:04.000\na copy of the schedule.');
    expect(mergeCues(cues)).toEqual([{ start: 1, end: 4, text: 'Please bring a copy of the schedule.' }]);
    expect(parseSubtitles('1\n00:00:01,100 --> 00:00:02,400\nHello.')[0]).toEqual({ start: 1.1, end: 2.4, text: 'Hello.' });
    expect(() => parseSubtitles('00:03.000 --> 00:01.000\nBad')).toThrow();
  });
  it('removes rolling overlap without dropping synchronization', () => {
    expect(mergeCues([{ start: 0, end: 2, text: 'Please bring' }, { start: 1, end: 4, text: 'Please bring the schedule.' }])).toEqual([{ start: 0, end: 4, text: 'Please bring the schedule.' }]);
  });
  it('does not duplicate repeated overlapping captions', () => {
    expect(mergeCues([{ start: 0, end: 2, text: 'Hello' }, { start: 1, end: 3, text: 'Hello' }, { start: 3, end: 4, text: 'everyone.' }])).toEqual([{ start: 0, end: 4, text: 'Hello everyone.' }]);
  });
  it('normalizes common contractions, punctuation and whitespace', () => {
    expect(normalize("I'm here, and I won't leave!")).toEqual(normalize('I am here and I will not leave'));
    expect(gradeText("Don't be late.", 'DO NOT be late!').score).toBe(1);
  });
  it('distinguishes spelling, missing and extra words', () => {
    expect(gradeText('Bring the schedule tomorrow', 'Bring the shedule tomorrow').words.some(w => w.kind === 'spelling')).toBe(true);
    expect(gradeText('Bring the schedule tomorrow', 'Bring schedule tomorrow').words.some(w => w.kind === 'missing')).toBe(true);
    expect(gradeText('Bring the schedule', 'Please bring the schedule').words.some(w => w.kind === 'extra')).toBe(true);
  });
  it('uses difficulty and never blanks the entire sentence', () => {
    const text = 'The manager has asked everyone to arrive early today';
    expect(cloze(text, 'HARD').answers.length).toBeGreaterThan(cloze(text, 'EASY').answers.length);
    for (const mode of ['EASY', 'MEDIUM', 'HARD']) expect(cloze(text, mode).tokens.filter(t => t !== '____').length).toBeGreaterThan(0);
  });
});
