import { Injectable } from '@nestjs/common';
import { fetchTranscript, type FetchParams } from 'youtube-transcript-plus';
import { mergeCues, type Cue } from './listening-core';

export abstract class TranscriptProvider { abstract fetch(videoId: string): Promise<{ cues: Cue[]; provider: string }>; }

@Injectable()
export class YoutubeTranscriptProvider extends TranscriptProvider {
  private readonly recent = new Map<string, { until: number; result: Promise<{ cues: Cue[]; provider: string }> }>();
  fetch(videoId: string) {
    const cached = this.recent.get(videoId);
    if (cached && cached.until > Date.now()) return cached.result;
    if (this.recent.size >= 64) this.recent.delete(this.recent.keys().next().value!);
    const entry = { until: Date.now() + 5 * 60000, result: this.fetchFresh(videoId) };
    this.recent.set(videoId, entry);
    // A blocked/missing caption track should not cost another network timeout for
    // every audio segment. Retry after a short cooldown; ASR remains the fallback.
    void entry.result.catch(() => { entry.until = Date.now() + 60000; });
    return entry.result;
  }
  private async fetchFresh(videoId: string) {
    const signal = AbortSignal.timeout(15000);
    let provider = 'youtube-auto';
    const boundedFetch = async (params: FetchParams) => {
      const url = new URL(params.url);
      if (url.protocol !== 'https:' || !(url.hostname === 'youtube.com' || url.hostname.endsWith('.youtube.com'))) throw new Error('Nguồn phụ đề không được hỗ trợ.');
      const response = await fetch(url, { method: params.method || 'GET', body: params.body, headers: { ...params.headers, 'User-Agent': params.userAgent || 'TOEIC-Listening' }, signal, redirect: 'error' });
      if (!response.ok) throw new Error(`YouTube HTTP ${response.status}`);
      // Prevent unlimited subtitle/page downloads; never download video media.
      const reader = response.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (!reader) throw new Error('YouTube trả về nội dung rỗng.');
      try { for (;;) { const value = await reader.read(); if (value.done) break; size += value.value.byteLength; if (size > 4_000_000) throw new Error('Phụ đề quá lớn.'); chunks.push(value.value); } }
      finally { await reader.cancel(); }
      return new Response(Buffer.concat(chunks), { headers: response.headers, status: response.status });
    };
    try {
    const segments = await fetchTranscript(videoId, {
      lang: 'en', signal, retries: 0, videoFetch: boundedFetch, transcriptFetch: boundedFetch,
      playerFetch: async (params: FetchParams) => {
        const response = await boundedFetch(params);
        const payload = await response.json();
        const tracklist = payload.captions?.playerCaptionsTracklistRenderer;
        if (tracklist?.captionTracks) {
          const english = tracklist.captionTracks.filter((track: { languageCode: string }) => /^en(?:-|$)/i.test(track.languageCode));
          english.sort((a: { kind?: string }, b: { kind?: string }) => Number(a.kind === 'asr') - Number(b.kind === 'asr'));
          provider = english[0]?.kind === 'asr' ? 'youtube-auto' : 'youtube-manual';
          // Adapter for library's exact language match; signed track URLs remain intact.
          tracklist.captionTracks = english.map((track: object) => ({ ...track, languageCode: 'en' }));
        }
        return new Response(JSON.stringify(payload), { headers: { 'Content-Type': 'application/json' } });
      },
    });
    const cues = mergeCues(segments.map((s: { offset: number; duration: number; text: string }) => ({ start: s.offset, end: s.offset + s.duration, text: s.text })));
    if (!cues.length) throw new Error('Empty captions');
    return { cues, provider };
    } catch (original) {
      // The player API and watch page can expose different caption tracks.
      // Stay within the same time/size budget; never fetch video media.
      if (signal.aborted || /403|429|không được hỗ trợ/.test(String(original))) throw original;
      const page = await (await boundedFetch({ url: `https://www.youtube.com/watch?v=${videoId}&hl=en` } as FetchParams)).text();
      const marker = /(?:var\s+)?ytInitialPlayerResponse\s*=\s*/g.exec(page);
      if (!marker) throw original;
      const begin = page.indexOf('{', marker.index + marker[0].length);
      let depth = 0; let quoted = false; let escaped = false; let finish = -1;
      for (let i = begin; i >= 0 && i < page.length; i++) {
        const char = page[i];
        if (quoted) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') quoted = false; }
        else if (char === '"') quoted = true;
        else if (char === '{') depth++;
        else if (char === '}' && --depth === 0) { finish = i + 1; break; }
      }
      if (finish < 0) throw original;
      const payload = JSON.parse(page.slice(begin, finish));
      const tracks = (payload.captions?.playerCaptionsTracklistRenderer?.captionTracks || []) as { languageCode: string; kind?: string; baseUrl: string }[];
      const track = tracks.filter(t => /^en(?:-|$)/i.test(t.languageCode)).sort((a, b) => Number(a.kind === 'asr') - Number(b.kind === 'asr'))[0];
      if (!track) throw new Error('English captions NotAvailable');
      const captionUrl = new URL(track.baseUrl); captionUrl.searchParams.set('fmt', 'json3');
      const data = await (await boundedFetch({ url: captionUrl.toString() } as FetchParams)).json();
      const cues = mergeCues((data.events || []).filter((event: { segs?: unknown[]; dDurationMs?: number }) => event.segs?.length && event.dDurationMs).map((event: { tStartMs: number; dDurationMs: number; segs: { utf8?: string }[] }) => ({ start: event.tStartMs / 1000, end: (event.tStartMs + event.dDurationMs) / 1000, text: event.segs.map(segment => segment.utf8 || '').join('') })));
      if (!cues.length) throw new Error('Empty captions');
      return { cues, provider: track.kind === 'asr' ? 'youtube-auto' : 'youtube-manual' };
    }
  }
}

export function transcriptError(error: unknown): string {
  const message = error && typeof error === 'object' ? `${'name' in error ? String(error.name) : ''} ${'message' in error ? String(error.message) : ''}` : '';
  if (/fetch failed|ENOTFOUND|ECONN|network/i.test(message)) return 'Máy chủ chưa kết nối được tới YouTube. Bạn vẫn có thể nghe video hoặc chọn bài có lời thoại sẵn trong thư viện.';
  if (/timeout|abort/i.test(message)) return 'YouTube phản hồi quá chậm. Bạn có thể thử lại hoặc chọn bài có lời thoại sẵn.';
  if (/429|403|blocked|TooMany/i.test(message)) return 'YouTube đang chặn hoặc giới hạn truy cập phụ đề. Video vẫn có thể xem; hãy chọn bài có lời thoại sẵn.';
  if (/Unavailable|Disabled|NotAvailable|language/i.test(message)) return 'Không tìm được phụ đề tiếng Anh phù hợp hoặc video không khả dụng. Bạn có thể nghe tự do hoặc chọn bài khác.';
  return 'Chưa lấy được phụ đề từ YouTube. Dịch vụ có thể đã thay đổi; bạn vẫn có thể xem video hoặc chọn bài khác.';
}
