import { jest } from '@jest/globals';
import { LocalAsrProvider } from './local-asr.provider';

function fixture() {
  const provider = new LocalAsrProvider();
  const internal = provider as unknown as { python(command: string, args: string[], timeout: number): Promise<{ url: string; duration: number }>; resolveAudio(videoId: string): Promise<{ url: string; duration: number }> };
  const resolve = jest.spyOn(internal, 'python');
  return { internal, resolve };
}
describe('short lived audio metadata cache', () => {
  it('shares audio resolution across segments but refreshes after expiration', async () => {
    const f = fixture(); f.resolve.mockResolvedValue({ url: 'https://test.googlevideo.com/audio', duration: 120 });
    await Promise.all([f.internal.resolveAudio('dQw4w9WgXcQ'), f.internal.resolveAudio('dQw4w9WgXcQ')]);
    expect(f.resolve).toHaveBeenCalledTimes(1);
    const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 121000);
    try { await f.internal.resolveAudio('dQw4w9WgXcQ'); expect(f.resolve).toHaveBeenCalledTimes(2); }
    finally { clock.mockRestore(); }
  });
  it('does not reuse failed resolution or accept an untrusted audio host', async () => {
    const f = fixture(); f.resolve.mockResolvedValueOnce({ url: 'https://evil.test/audio', duration: 120 }).mockResolvedValueOnce({ url: 'https://test.googlevideo.com/audio', duration: 120 });
    await expect(f.internal.resolveAudio('dQw4w9WgXcQ')).rejects.toThrow('INVALID_AUDIO_SOURCE');
    await expect(f.internal.resolveAudio('dQw4w9WgXcQ')).resolves.toHaveProperty('duration', 120);
    expect(f.resolve).toHaveBeenCalledTimes(2);
  });
});
