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
  it('reuses a blocked caption attempt briefly instead of repeating network calls per segment', async () => {
    const http = jest.fn(async () => new Response('', { status: 403 }));
    global.fetch = http as typeof fetch;
    const provider = new YoutubeTranscriptProvider();
    await expect(provider.fetch('dQw4w9WgXcQ')).rejects.toThrow('403');
    const calls = http.mock.calls.length;
    await expect(provider.fetch('dQw4w9WgXcQ')).rejects.toThrow('403');
    expect(http).toHaveBeenCalledTimes(calls);
    const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 61000);
    try { await expect(provider.fetch('dQw4w9WgXcQ')).rejects.toThrow('403'); expect(http.mock.calls.length).toBeGreaterThan(calls); }
    finally { clock.mockRestore(); }
  });
  it('coalesces simultaneous caption requests and reuses their successful result', async () => {
    const provider = new YoutubeTranscriptProvider();
    const fresh = jest.spyOn(provider as unknown as { fetchFresh(id: string): Promise<{ cues: { start: number; end: number; text: string }[]; provider: string }> }, 'fetchFresh').mockResolvedValue({ cues: [{ start: 0, end: 2, text: 'Listen carefully.' }], provider: 'youtube-manual' });
    const [first, second] = await Promise.all([provider.fetch('dQw4w9WgXcQ'), provider.fetch('dQw4w9WgXcQ')]);
    expect(first).toEqual(second); await provider.fetch('dQw4w9WgXcQ'); expect(fresh).toHaveBeenCalledTimes(1);
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
