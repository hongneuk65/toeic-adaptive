# Functional audit — 2026-10-18

Local application: frontend http://127.0.0.1:5173, backend http://127.0.0.1:3000, PostgreSQL local.

## Changes

- Listening library now searches the whole accessible collection and returns stable pages of 24 sources. Omitted empty source filters prevent validation failures. Switching saved sessions clears the interrupted initial restore state.
- Theory quizzes render source audio, pictures and structured Reading documents. Part 2 presents three choices; Parts 1/2 hide option transcripts.
- Imported Reading questions preserve their original order. The first-question gate applies only when the first question actually tests the main idea.
- Reading admin derives source rules from stored provenance: existing crawl content supports original question order, optional evidence and short notices; new authored/AI material retains strict validation. Editing retains CRAWL origin. Invalid review input returns 400.
- Flashcard inputs reject missing or blank words/meanings. The large vocabulary grid initially renders 24 cards and offers incremental loading.
- Question admin supports Part 2's three choices, filters source provenance, preserves source markers and invalidates derived media/passage data when edited. Admin-authored questions enter the usable question bank.
- Admin editors prevent duplicate submissions and stale source/subtitle assignments. Listening administration searches and pages source rows and limits media dropdown rendering.

## Verification

- Backend and frontend production builds passed.
- Frontend tests: 55 passed. Backend full suite: 167 passed across 34 suites, including five source-aware Reading regressions. Frontend ESLint and scoped backend lint passed.
- `backend/test/system-functional.integration.cjs`: 38 successful authenticated API requests plus rejection checks. Covers admin reads, question create/update, crawl Reading draft/review, learner Reading submit, flashcard create/review, Listening pagination, mastery, theory and real exam creation. Temporary records are removed in finally; original content and account permissions are unchanged.
- Browser: verified Listening initial load, page 2, search and opening source audio; verified vocabulary folder, focused study and 24-card grid; verified theory quiz rendering. Source evidence image: `ui-functional-audit.png`.

## Verification boundaries

- The browser session belongs to a learner. Admin APIs were exercised with the existing local ADMIN identity; an authenticated ADMIN browser session was not available for end-to-end form interaction.
- Imported audio without timed transcripts supports playback. Dictation/cloze require real SRT/VTT or generated timed transcripts; this audit does not fabricate timing.
- Live third-party AI, YouTube and microphone/ASR behavior was not exhaustively tested. The production build still warns about JavaScript chunks larger than 500 kB.
