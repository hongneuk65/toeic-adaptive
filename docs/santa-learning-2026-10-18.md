# Santa learning repair — 2026-10-18

## Implemented and applied locally

- Reading clause practice: `/reading?practice=clauses`, 12 curated business sentences with main clause, subject, full main verb group and Vietnamese explanations. This is a separate browser exercise, not an unrestricted English parser or a scored exam.
- Reading source presentation reuses allowlisted structured documents from an exact matching imported passage. Tables, emphasis and multiple documents are preserved. A plain-text toggle retains vocabulary selection and original evidence offsets. Edited passages fall back to saved text to avoid stale documents.
- Reading import now follows original question positions. Repair created 40 new versions and updated 80 current/published pointers; historical attempts retain their original versions. Edited admin content is protected.
- 854 vocabulary cards moved into 19 public folders: 14 topical categories plus five general vocabulary/word-class categories. Classification uses curated vocabulary/context rules and source part-of-speech metadata, not invented Santa topic labels. Card IDs, notes and reviews remain intact. The former combined folder remains available for existing links.
- 913 Part 1/2 audio sources now have genuine source speech as a single measured whole-audio segment. Sentence timestamps were not fabricated. Source graphics from Part 3/4 are never used as spoken scripts.
- The other 664 Part 3/4 sources support on-demand local ASR. Starting a lesson prepares a transcript and refreshes the saved session when ready. One real Part 3 source was transcribed into eight timed units and tested successfully.
- Dictation, cloze and Shadowing are available directly when opening a source. Shadowing allows explicit script reveal without requiring a recording. Optional recordings remain browser-local; pronunciation is self-assessed.

## Local runtime repair

ASR was disabled and pointed to system Python without `faster_whisper`. Local configuration now enables the existing model and uses `backend/.venv-listening/Scripts/python.exe`.

Docker Desktop did not start. A portable Redis development runtime was prepared under ignored `backend/storage/redis-runtime` from https://github.com/tporadowski/redis/releases/tag/v5.0.14.1. Port 6379 could not bind; local Redis runs on **127.0.0.1:6380**, and local `.env` points there. No Windows service was installed. Redis 5 emits BullMQ's recommendation for Redis 6.2+; production should use the repository's Redis 7 container.

After stopping the local processes, restart Redis from that directory with `redis-server.exe --bind 127.0.0.1 --port 6380 --appendonly yes --maxmemory-policy noeviction`, backend with `node dist/main.js` from `backend`, and frontend with `npm run dev -- --host 127.0.0.1 --port 5173 --strictPort` from `frontend`.

## Validation

- Backend: 171 tests passed across 37 suites; frontend: 57 passed. Both production builds and frontend ESLint passed. Existing large-chunk warnings remain.
- Importer tests cover source transcripts, topic classification/moves and Reading order/version safety.
- `backend/test/santa-learning.integration.cjs --asr` passed against real local PostgreSQL/Redis: 19 folders, 854 cards, Part 2 Dictation/Shadowing, two source Reading documents, Part 3 ASR and eight usable units.
- `backend/test/system-functional.integration.cjs`: 38 requests passed plus access/input rejection checks. Temporary learner/admin test records are removed; prepared shared learning content remains.
- Browser checked clause selection/feedback and Santa Shadowing session/script reveal. Microphone recording was not exercised. ASR output is machine-generated and may contain recognition errors.

## Repeatable data commands (from backend)

```
node prisma/reorganize-santa-vocabulary.cjs --apply
node prisma/prepare-santa-listening.cjs --apply
node prisma/repair-santa-reading-order.cjs --apply
```

Each importer is idempotent and preserves existing learning history.
