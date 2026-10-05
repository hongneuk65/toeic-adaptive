# AI Tutor / RAG latency

## Changes (2026-09-21)

- Gemini 2.5 Flash / Flash Lite use `thinkingBudget: 0` by default. Other model
  families do not receive this model-specific setting. Existing configured model
  and provider order (Gemini, then OpenAI if configured) are preserved.
- Both JSON and SSE calls share the same streaming provider implementation and
  honor the caller's output-token limit: chat 1,200, explanations 1,800.
- No alias retries on quota, authentication, network, or overload failures. Only
  a missing configured model (404) permits one attempt at the stable Flash model;
  duplicate model names are removed. Failed providers cool down for 30 seconds.
- First-text, idle, and total LLM deadlines abort the actual upstream fetch,
  including a stalled response body, rather than merely rejecting a wrapper.
- Removed artificial delays from the existing offline fallback.
- Independent question/history and mastery/retrieval queries run concurrently.
  Knowledge chunks and lessons also load concurrently, with in-flight sharing and
  a 60-second, process-local cache (at most 16 part keys). Failed reads are evicted.
  Personalized answers, chat history, and mastery are **not** cached.
- History and retrieved context are bounded to avoid oversized prompts; the chat
  prompt requests a direct answer with an example, without unnecessary repetition.
- `POST /rag/explain-error-stream` emits `{chunk}`, then `{result}` with the
  existing four-section explanation schema, then `[DONE]`. The original JSON
  explanation endpoint remains available.
- The explanation modal displays text as it arrives; errors retain partial text
  and offer retry. Chat and explanations share a UTF-8-safe SSE reader that checks
  completion and releases/cancels its reader on all exit paths.
- Closing either panel, changing its context, or unmounting aborts the client
  request; SSE response close propagates cancellation to the model. Cancelled or
  interrupted chat replies are not saved as complete assistant messages. A user
  message saved before cancellation can remain in history.
- Backend streams include anti-buffering headers and heartbeat comments. Chat
  avoids restarting smooth scrolling for every token and rejects duplicate sends.

## Optional environment settings

Set these in `D:\NEU\KHOA_LUAN\toeic-adaptive\backend\.env` and restart the backend.
No environment or secret changes are required to use the defaults.

| Variable | Default | Notes |
| --- | --- | --- |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Existing value is respected. |
| `GEMINI_THINKING_BUDGET` | `0` | Applied only to the supported 2.5 Flash models; `-1` enables dynamic thinking, at a latency cost. |
| `OPENAI_MODEL` | `gpt-4o-mini` | Used only if `OPENAI_API_KEY` is configured. |
| `LLM_FIRST_TOKEN_TIMEOUT_MS` | `8000` | Per-provider wait for the first visible text; includes connection/header time. |
| `LLM_IDLE_TIMEOUT_MS` | `10000` | Maximum silence between visible chunks. |
| `LLM_TOTAL_TIMEOUT_MS` | `45000` | Shared generation budget across providers. Does not include database preparation. |

These are failure deadlines, **not a guaranteed end-to-end response time**.
Two configured providers can each consume a first-text timeout before offline
fallback. On a slow network, increase the first-token timeout rather than
silently retrying the same provider/model repeatedly.

Reduced thinking can affect complex reasoning quality. The retrieved sources,
question context, mastery-specific instructions, and four explanation sections
are retained, but pedagogical quality still needs real-model review. The existing
offline heuristic fallback is not equivalent to a successful model answer.

Knowledge edits become visible after the cache TTL (or immediately on process
restart). Multiple backend processes have independent caches/cooldowns. The
retriever still ranks candidates in memory; a much larger corpus will need
indexed retrieval instead of this cache alone.

## Verification

PowerShell commands:

```powershell
Set-Location 'D:\NEU\KHOA_LUAN\toeic-adaptive\backend'
npm test -- --runInBand --ci --silent
npm run build
npm run lint

Set-Location 'D:\NEU\KHOA_LUAN\toeic-adaptive\frontend'
npm test
npm run build
npm run lint

git -C 'D:\NEU\KHOA_LUAN\toeic-adaptive' --no-pager -c core.safecrlf=false diff --check
```

New tests exercise token/thinking configuration, streaming before completion,
UTF-8 fragmentation, model fallback, cooldown expiry, first-text/idle/total
timeouts, caller cancellation, partial-stream failure, reader cleanup, concurrent
retrieval/cache expiry/recovery, per-request mastery, chat persistence, and SSE
controller response order/disconnect cleanup. Frontend tests use the existing
TypeScript compiler and Node test runner; no new dependencies or schema migration.

Final verification: backend **84 tests / 19 suites passed**, build exit 0, Oxlint
exit 0 (no warnings/errors). Frontend **24 tests passed**, production build exit
0, ESLint exit 0. `git diff --check` exited 0; edited files were also checked for
empty content and conflict markers. Provider unit tests use mocks rather than
spending API quota. No browser interaction test was run.

### Live provider probe

Two direct streaming requests using the configured Gemini model/key and the same
short synthetic TOEIC grammar prompt returned:

| Configuration | HTTP | Time to error |
| --- | --- | --- |
| Existing dynamic thinking | 503 | 9,514 ms |
| Thinking disabled | 503 | 3,905 ms |

Neither returned an answer. These timings are **not a speedup benchmark**; they
show provider unavailability during this check. No learner data was sent in the
probe and no secrets were printed. Successful real-model first-text/total latency
and explanation quality remain unverified. Debug logs now record `first text`
and `completed` generation times when the provider succeeds.

### Browser follow-up (not automated here)

1. Open AI Tutor and ask a grammar question. Confirm visible text arrives before
   generation completes; rapid double-send must create only one pending request.
2. Open an explanation. Confirm incremental text transitions to the existing four
   sections with the correct selected answer, mastery, and sources.
3. Close/reopen or switch questions mid-response. The old request must be cancelled
   and its chunks must not appear in the new explanation/chat context.
4. Simulate a disconnect mid-answer. Partial text must be marked incomplete;
   explanation retry must start a fresh request without mixing old chunks.
5. Check deployed proxy/CDN settings do not buffer SSE despite the headers.

This change does not address exam-wide answer-access rules or the separate
mastery-queue delivery concerns described in the existing verification guide.