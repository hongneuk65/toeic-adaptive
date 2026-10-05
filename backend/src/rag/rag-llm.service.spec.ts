import { jest } from '@jest/globals';
import { RagLlmService } from './rag-llm.service';

const prompt = { systemPrompt: 'AI TOEIC Tutor', userPrompt: 'Explain although', maxTokens: 321 };
const geminiEvent = (text: string, finishReason?: string) => `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }] })}\n\n`;

describe('RagLlmService latency and streaming', () => {
  let service: RagLlmService;
  let fetchMock: ReturnType<typeof jest.spyOn<typeof globalThis, 'fetch'>>;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    env = { ...process.env };
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    delete process.env.OPENAI_API_KEY;
    for (const key of ['LLM_TOTAL_TIMEOUT_MS', 'LLM_FIRST_TOKEN_TIMEOUT_MS', 'LLM_IDLE_TIMEOUT_MS', 'GEMINI_THINKING_BUDGET']) delete process.env[key];
    service = new RagLlmService();
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });
  afterEach(() => {
    process.env = env;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('honors token limit and disables Flash thinking without leaking keys into URLs', async () => {
    fetchMock.mockResolvedValue(new Response(geminiEvent('Đúng', 'STOP')));
    expect(await service.generateText(prompt)).toBe('Đúng');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).not.toContain('test-key');
    expect(JSON.parse(init!.body as string).generationConfig).toEqual({ temperature: 0.4, maxOutputTokens: 321, thinkingConfig: { thinkingBudget: 0 } });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not send Flash-only settings to a different model', async () => {
    process.env.GEMINI_MODEL = 'gemini-2.5-pro';
    fetchMock.mockResolvedValue(new Response(geminiEvent('ok', 'STOP')));
    await service.generateText(prompt);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).generationConfig.thinkingConfig).toBeUndefined();
  });

  it('finishes immediately on a provider completion frame without waiting for socket EOF', async () => {
    const cancel = jest.fn();
    fetchMock.mockResolvedValue(new Response(new ReadableStream({
      start(controller) { controller.enqueue(new TextEncoder().encode(geminiEvent('done', 'STOP'))); },
      cancel,
    })));
    expect(await service.generateText(prompt)).toBe('done');
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it('delivers the first chunk before completion and cancels when the consumer stops', async () => {
    let streamController!: ReadableStreamDefaultController<Uint8Array>;
    const cancel = jest.fn();
    fetchMock.mockResolvedValue(new Response(new ReadableStream({ start(controller) { streamController = controller; }, cancel })));
    const iterator = service.streamText(prompt);
    const first = iterator.next();
    streamController.enqueue(new TextEncoder().encode(geminiEvent('first')));
    expect((await first).value).toBe('first');
    await iterator.return(undefined);
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true);
  });

  it.each([401, 403, 429, 503])('does not retry aliases on HTTP %s and cools down failed providers', async (status) => {
    fetchMock.mockResolvedValue(new Response('', { status }));
    expect(await service.generateText(prompt)).toBeTruthy();
    expect(await service.generateText(prompt)).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('only falls back to a different stable model when the configured model is missing', async () => {
    process.env.GEMINI_MODEL = 'missing-model';
    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response(geminiEvent('ok', 'STOP')));
    expect(await service.generateText(prompt)).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[1][0])).toContain('gemini-2.5-flash');
  });

  it('falls back to OpenAI once, honoring maxTokens there too', async () => {
    process.env.OPENAI_API_KEY = 'other-key';
    fetchMock.mockResolvedValueOnce(new Response('', { status: 429 }))
      .mockResolvedValueOnce(new Response('data: {"choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n'));
    expect(await service.generateText(prompt)).toBe('ok');
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string).max_tokens).toBe(321);
  });

  it('aborts stalled first-token requests at the deadline instead of hanging', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
    }));
    const answer = service.generateText(prompt);
    await jest.advanceTimersByTimeAsync(8001);
    expect(await answer).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]!.signal!.aborted).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('times out a stream stalled after headers, even when no text has arrived', async () => {
    jest.useFakeTimers();
    fetchMock.mockImplementation(async (_url, init) => new Response(new ReadableStream({
      start(controller) {
        init!.signal!.addEventListener('abort', () => controller.error(init!.signal!.reason), { once: true });
      },
    })));
    const answer = service.generateText(prompt);
    await jest.advanceTimersByTimeAsync(8001);
    expect(await answer).toBeTruthy();
    expect(jest.getTimerCount()).toBe(0);
  });

  it('propagates caller cancellation without fallback or poisoning provider health', async () => {
    const controller = new AbortController();
    fetchMock.mockImplementationOnce((_url, init) => new Promise((_resolve, reject) => {
      init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true });
    }));
    const answer = service.generateText({ ...prompt, signal: controller.signal });
    const rejected = expect(answer).rejects.toThrow();
    controller.abort();
    await rejected;
    fetchMock.mockResolvedValueOnce(new Response(geminiEvent('ok', 'STOP')));
    expect(await service.generateText(prompt)).toBe('ok');
  });

  it('does not start a request that was already cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(service.generateText({ ...prompt, signal: controller.signal })).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retries a recovered provider after the cooldown expires', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
    await service.generateText(prompt);
    await jest.advanceTimersByTimeAsync(30001);
    fetchMock.mockResolvedValueOnce(new Response(geminiEvent('recovered', 'STOP')));
    expect(await service.generateText(prompt)).toBe('recovered');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    { timeout: 'idle', ms: 10001 },
    { timeout: 'total', ms: 1001 },
  ])('enforces the $timeout deadline after text starts', async ({ timeout, ms }) => {
    jest.useFakeTimers();
    if (timeout === 'total') process.env.LLM_TOTAL_TIMEOUT_MS = '1000';
    fetchMock.mockImplementation(async (_url, init) => new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(geminiEvent('partial')));
        init!.signal!.addEventListener('abort', () => controller.error(init!.signal!.reason), { once: true });
      },
    })));
    const iterator = service.streamText(prompt);
    expect((await iterator.next()).value).toBe('partial');
    const rejected = expect(iterator.next()).rejects.toThrow('timed out');
    await jest.advanceTimersByTimeAsync(ms);
    await rejected;
    expect(jest.getTimerCount()).toBe(0);
  });

  it('reports an incomplete answer instead of mixing a fallback into partial text', async () => {
    process.env.OPENAI_API_KEY = 'other-key';
    fetchMock.mockResolvedValue(new Response(geminiEvent('partial')));
    const iterator = service.streamText(prompt);
    expect((await iterator.next()).value).toBe('partial');
    await expect(iterator.next()).rejects.toThrow('before completion');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('parses split UTF-8 and all text parts but omits thought parts', async () => {
    const data = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: 'hidden', thought: true }, { text: 'Giải ' }, { text: 'thích' }] }, finishReason: 'STOP' }] })}\n\n`;
    fetchMock.mockResolvedValue(new Response(new ReadableStream({ start(controller) {
      for (const byte of new TextEncoder().encode(data)) controller.enqueue(new Uint8Array([byte]));
      controller.close();
    } })));
    expect(await service.generateText(prompt)).toBe('Giải thích');
  });
});