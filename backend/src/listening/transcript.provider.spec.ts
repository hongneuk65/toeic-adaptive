import { jest } from '@jest/globals';
import { YoutubeTranscriptProvider, transcriptError } from './transcript.provider';

describe('YouTube transcript adapter (real library, controlled HTTP fixtures)', () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  it('prefers manual English over automatic captions and merges real cue timestamps', async () => {
    const urls: string[] = [];
    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = String(input); urls.push(url);
      if (url.includes('/watch?')) return new Response('"INNERTUBE_API_KEY":"test-key"');
      if (url.includes('/player?')) return Response.json({ playabilityStatus: { status: 'OK' }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [
        { languageCode: 'en', kind: 'asr', baseUrl: 'https://www.youtube.com/auto' },
        { languageCode: 'en-GB', baseUrl: 'https://www.youtube.com/manual' },
      ] } } });
      return new Response('<transcript><text start="10" dur="2">Please bring</text><text start="12" dur="3">the schedule.</text></transcript>');
    }) as typeof fetch;
    const result = await new YoutubeTranscriptProvider().fetch('dQw4w9WgXcQ');
    expect(result.provider).toBe('youtube-manual');
    expect(result.cues).toEqual([{ start: 10, end: 15, text: 'Please bring the schedule.' }]);
    expect(urls[2]).toContain('/manual');
    expect(urls.some(url => /googlevideo|videoplayback/.test(url))).toBe(false);
  });
  it('falls back to automatic English when manual captions are absent', async () => {
    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/watch?')) return new Response('"INNERTUBE_API_KEY":"test-key"');
      if (url.includes('/player?')) return Response.json({ captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: 'en', kind: 'asr', baseUrl: 'https://www.youtube.com/auto' }] } } });
      return new Response('<text start="1200" dur="3">This is a short sentence.</text>');
    }) as typeof fetch;
    const result = await new YoutubeTranscriptProvider().fetch('dQw4w9WgXcQ');
    expect(result.provider).toBe('youtube-auto'); expect(result.cues[0].start).toBe(1200);
  });
  it('reports blocked HTTP and never creates invented text', async () => {
    global.fetch = jest.fn(async () => new Response('', { status: 403 })) as typeof fetch;
    await expect(new YoutubeTranscriptProvider().fetch('dQw4w9WgXcQ')).rejects.toThrow('403');
    expect(transcriptError(new Error('HTTP 403'))).toContain('chặn');
    expect(transcriptError(new DOMException('timeout', 'TimeoutError'))).toContain('quá chậm');
  });
  it('reports unavailable English and rejects transcript URLs outside YouTube', async () => {
    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/watch?')) return new Response('"INNERTUBE_API_KEY":"test-key"');
      return Response.json({ playabilityStatus: { status: 'OK' }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: 'en', baseUrl: 'http://127.0.0.1/private' }] } } });
    }) as typeof fetch;
    await expect(new YoutubeTranscriptProvider().fetch('dQw4w9WgXcQ')).rejects.toThrow('không được hỗ trợ');
  });
  it('uses watch-page JSON3 captions when the player API has no tracks', async () => {
    global.fetch = jest.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/watch?')) return new Response('"INNERTUBE_API_KEY":"test-key"; var ytInitialPlayerResponse = ' + JSON.stringify({ captions: { playerCaptionsTracklistRenderer: { captionTracks: [{ languageCode: 'en', baseUrl: 'https://www.youtube.com/captions' }] } } }) + ';');
      if (url.includes('/player?')) return Response.json({ playabilityStatus: { status: 'OK' } });
      return Response.json({ events: [{ tStartMs: 5000, dDurationMs: 2000, segs: [{ utf8: 'Please listen.' }] }] });
    }) as typeof fetch;
    const result = await new YoutubeTranscriptProvider().fetch('dQw4w9WgXcQ');
    expect(result).toEqual({ provider: 'youtube-manual', cues: [{ start: 5, end: 7, text: 'Please listen.' }] });
  });

});
