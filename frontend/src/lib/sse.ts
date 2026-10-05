// Shared by chat and explanations. Network frames can split JSON and UTF-8 anywhere.
export async function* readJsonSse<T>(response: Response): AsyncGenerator<T> {
  if (!response.body) throw new Error('Máy chủ không trả về luồng dữ liệu AI.');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() || '';
      if (done && buffer.trim()) events.push(buffer);
      for (const event of events) {
        const data = event.split(/\r?\n/)
          .filter((line) => line.startsWith('data:'))
          .map((line) => line.slice(5).trim()).join('\n');
        if (!data) continue;
        if (data === '[DONE]') return;
        const parsed = JSON.parse(data) as Awaited<T> & { message?: string };
        if (parsed.message) throw new Error(parsed.message);
        yield parsed;
      }
      if (done) throw new Error('Câu trả lời AI bị ngắt trước khi hoàn tất. Vui lòng thử lại.');
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      // Fetch cancellation may already have closed the reader.
    }
    reader.releaseLock();
  }
}