# Adaptive learning verification

## Confirmed results — 2026-09-21

Executed on Windows with Node v20.20.2; results below were visible in command output.

| Check | Result |
| --- | --- |
| Prisma validate / generate | Passed; Prisma Client v5.22.0 generated |
| Backend Jest | 54 tests passed across 16 suites |
| Backend lint | Passed, zero warnings/errors |
| Backend build | Passed as part of the integration command |
| Live PostgreSQL integration | Fresh/legacy migrations, exam concurrency/rollback, mastery retry/rollback, same-user serialization and different-user independence passed |
| Frontend Node tests | 17 passed |
| Frontend lint / production build | Both passed |
| Git diff whitespace check | Passed; Git emitted LF-to-CRLF conversion warnings only |

The initial frontend wildcard test command failed on Node 20/Windows; it now uses
an explicit test-file path. Backend Jest emits the expected experimental VM-module
warning. Neither browser flows nor live Redis delivery were exercised.

## Repeatable checks (PowerShell)

```powershell
Set-Location 'D:\NEU\KHOA_LUAN\toeic-adaptive\backend'
npx --no-install prisma validate
npx --no-install prisma generate
npm test -- --runInBand --ci
npm run lint
npm run test:learning:integration

Set-Location 'D:\NEU\KHOA_LUAN\toeic-adaptive\frontend'
npm test
npm run lint
npm run build

Set-Location 'D:\NEU\KHOA_LUAN\toeic-adaptive'
git diff --check
```

Backend lint uses `oxlint` without `--fix`; frontend lint uses `eslint` without
`--fix`. Neither command intentionally rewrites source files.

## Automated coverage

- Exam unit tests cover configured counts, stored membership, owner-only access,
  resumption, invalid and duplicate answers, blank/partial submissions, concurrent
  submission claims, review gating, and DTO validation.
- DAS3H unit tests cover prediction-before-history ordering, deduplicated skills,
  processed job IDs, failed writes, untagged questions, and answer/skill validation.
- Theory tests reject missing, duplicate, or foreign questions and check grading
  and server-derived skill IDs.
- The Nest queue-module test resolves the real module graph and DAS3H provider
  with mocked Prisma and queue transports. Worker registration is disabled, so it
  does not connect to Redis or consume application jobs. It also checks propagation
  of transaction errors and the original job ID. Queue tests check UUID uniqueness,
  retry/backoff options, and empty batches.
- Frontend tests use Node's built-in test runner and the existing TypeScript
  compiler. They exercise the actual exam-session utilities: server-based timing,
  expiration, saved-answer validation, question membership, and unavailable storage.
  Storage tests cover round trips, write failures, attempt-specific cleanup, and
  cleanup failures that must not obscure a successfully committed submission.
  These are **not** browser or React-component tests.

## Live PostgreSQL integration test

`npm run test:learning:integration` builds the backend, then runs
`D:\NEU\KHOA_LUAN\toeic-adaptive\backend\test\learning.integration.cjs`.
It needs Node 20.12+ and a reachable `DATABASE_URL` (environment or backend `.env`)
with permission to create/drop schemas and inspect its own PostgreSQL locks.

The script creates random `learning_test_<uuid>` schemas and drops them in `finally`.
It does not deploy migrations into, seed, or clear the application schema. Prefer a
dedicated test database anyway: connection limits and advisory locks are shared by
all schemas in one database. Random high fixture user IDs reduce advisory-key
collisions with application users. If the process is forcibly terminated, inspect
and remove only the abandoned test schemas, never the application's schema.

Checks include:

1. Fresh migration deployment and an empty Prisma schema diff.
2. Existing compatible knowledge/chat tables and rows surviving migration.
3. Legacy question-membership backfill for submitted attempts only.
4. Real exam resume/ownership checks, a concurrent submission race, complete blank
   reviews, and rollback of attempt status and answers together.
5. Retrying the same mastery job ID without duplicate writes, and rolling back
   ability/history/counters when a skill write fails.
6. Same-user events waiting on PostgreSQL advisory locks while another user's event
   completes; the second same-user update sees the first committed observation.

The legacy scenario constructs compatible pre-existing RAG tables; it does not
prove that arbitrary existing installations have matching columns or constraints.
Run a read-only schema comparison against an installation before deploying.
The SQL statement splitter is intentionally limited to the current migration
scripts; revise it before adding procedural SQL or semicolons inside SQL strings.

## Browser checklist — still manual

Use two owned lesson/skill fixtures and DevTools request throttling:

- Start an exam, answer several questions, refresh, and verify saved choices and
  elapsed time. Attempt access using a different account.
- Let an exam expire, fail the submit request, then restore connectivity and click
  submit again. Answers must remain available for the retry.
- Block browser storage and select an answer: an explicit warning should appear,
  but in-memory answers must remain usable. Successful submission must still open
  review even if storage cleanup fails. Navigate away during a pending submission;
  its late response must not navigate back or display a stale error.
- Submit a blank and a partial exam. Review must contain every question, explicitly
  distinguish unanswered items, and remain inaccessible before submission.
- Switch theory lessons/parts while fetches and quiz submissions are pending. Old
  content/results must not replace the current lesson. Clicking the already-selected
  lesson/part should not reset its quiz.
- Close or switch adaptive practice while a request is pending. Verify no stale
  result or error appears in the replacement modal and rapid double clicks submit
  only once. Verify roadmap failures display a retry control.

## Known delivery and retry limits

- **Mastery delivery is not durable across the exam-commit/enqueue boundary.** The
  grade transaction commits before Redis enqueueing; queue failures are logged and
  swallowed. A crash or Redis outage in that gap can lose mastery observations even
  though the exam is submitted. The proper next step is a PostgreSQL outbox written
  in the grading transaction, with a retrying dispatcher and stable event IDs.
- Job-ID deduplication protects a retry of the **same job**, not repeated adaptive
  or theory API submissions that generate new events. UI guards reduce accidental
  duplicates; server-side request idempotency remains separate work.
- Aborting a frontend request prevents stale UI updates; it cannot undo server work
  that has already committed.
- A lost successful exam-submit response is not automatically reconciled to review;
  a retry is rejected as already submitted. The review route remains available.
- Exam timeout is currently enforced by the browser using server `startedAt`, not
  by an authoritative server-side submission deadline.
- **Review gating is not a system-wide anti-cheating boundary.** The exam review
  endpoint checks ownership and submission, but authenticated RAG explanation/chat
  endpoints accept question IDs without checking active exam membership. The
  explainer returns the correct answer and chat includes it in the model context.
  Cross-endpoint answer-access rules need a separate design that also preserves
  normal adaptive practice and theory explanations.
- Live Redis delivery and end-to-end browser behavior are not covered by the checks
  above. No new browser-test library was added.