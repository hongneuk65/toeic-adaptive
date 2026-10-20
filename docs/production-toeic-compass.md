# TOEIC Compass production

URL: https://toeic-compass.up.railway.app

Railway project: `1dd9d15b-6644-4974-9b0c-d88a86b42ac3`, environment production `ff76c30a-97a9-484d-97f9-6d3c2dd6d452`.
Application service: `c94e5c22-15a3-4469-ac6e-51e4292339ab` (`toeic-compass`). Postgres/Redis are isolated services in this project. Existing unrelated projects were not changed.

Current successful media-inclusive deployment: `ee1d581e-9c0e-4211-adf8-b3320a10cc6c` (20/10/2026), image sha256:a0e42388c356a9a5755767a19ec596bff4bd5c539d5931c8cbb0d241591d527d. Web and API share one service due the current Railway resource limit. Same-origin API prefix `/api`; SPA deep links fall back to index.html, API errors do not.

## Verified

- HTTPS readiness, signup/login, authenticated catalog and trained DAS3H status.
- 5,049 imported questions,114 theory lessons,12 topic groups and19 visible vocabulary folders.
- Typed flashcard recall, create/submit Part5 exam, tutor response after submission.
- Initial library includes196 system reading articles,261 reading versions,1,578 listening source records,915 prepared transcripts,925 units,854 flashcards. No local learner accounts, attempts, chats or review history were copied.
- Gemini key transfer explicitly authorized by user; stored only in Railway server variables. No secrets committed or printed.
- Final image contains all1910media assets; build logs verified each SHA-256. Live Part1 exam12audio/image range requests returned206; actual browser audio currentTime advanced, images/render succeeded without JavaScript errors. Test exam was submitted afterward.

## Imported media

Required media:1,910files689,485,479bytes. All transferred to /app/media/exam and independently verified against filename SHA-256; bad files0. Extra local non-content files were not published. Audio/image HTTPS byte-range tests return206 with correct MIME types.

The full upload produced413 for508MBcompressed archive. Original CloudFront image URLs work, signed audio URLs return403. After explicit conditional user consent (no payment), media was transferred with a dedicated temporary SSH key. That key has been revoked and its private/public files deleted from workspace and ~/.ssh. Railway lists no registered SSH keys afterward.

Media-inclusive build: `ee1d581e-9c0e-4211-adf8-b3320a10cc6c` SUCCESS. It downloaded media from the previously running public site, verified each hash against deploy/media-release-manifest.json and stored source assets in the image (not the500MBvolume). Original bootstrap instance was removed; final-image media tests passed. If restoring from scratch with no running media source, bootstrap from the original local files first; do not rely on expired Santa signed URLs.

Billing check before SSH: account is a trial,4.525969USDremaining free usage credit and9trialdays remaining. No plan upgrade/payment method/purchase was made. Runtime, bandwidth and future traffic consume that credit; this is not indefinitely free hosting. User's authorization remains conditional on no additional payment.

## Release and restart

### GitHub release flow

Canonical source: https://github.com/hongneuk65/toeic-adaptive, branch `main`. The repository-root `railway.json` selects `deploy/railway-unified.Dockerfile`; build context must be the repository root. Local edits and commits alone do not update the website.

Connection status (20/10/2026): GitHub permissions confirmed. Automatic deployment trigger `81bdc6c6-6552-424e-a297-bb0dee7efce6` follows `hongneuk65/toeic-adaptive`, branch `main`, root `/`, with `checkSuites: true` (Wait for CI). Pushes wait for GitHub CI before deployment; failed CI prevents the release.

Initial GitHub build: commit `99d3bac` deployed successfully as `0938e79a-3ed9-47d6-b486-3061aa05b351`. Readiness, SPA routes, authenticated catalogs, trained DAS3H status and audio/image range requests passed after deployment. Its full GitHub CI run also succeeded.

Before pushing, run `npm run check`. GitHub CI additionally runs database/HTTP integration checks, browser regression checks and the Compose build. Check CI and the exact Railway deployment commit before treating a release as complete.

The compressed public library is versioned at `backend/prisma/public-library.json.gz`; its provenance and checksum are documented in `backend/prisma/PUBLIC_LIBRARY.md`. Boot applies migrations and imports this library only when content is empty. Existing production learner records remain in Postgres. Secrets are configured in Railway variables and must never be added to GitHub.

The commands below describe the original manual bootstrap. Normal updates use the GitHub flow above; no staging directory or manual upload is required.

Ignored release staging: deploy/railway-release. It contains source copies, model artifact, generated public-content snapshot and configuration. Snapshot produced by backend/scripts/export-public-content.cjs (system content only). Runtime boot-production.cjs runs migrations and import-public-content.cjs --if-empty before main; existing content is retained on subsequent boot. This avoids relying on a platform predeploy hook that was not executed on initial deployment.

Stage Dockerfile now matches deploy/railway-unified.Dockerfile; it starts node scripts/boot-production.cjs. Copy deploy/fetch-release-media.cjs to stage/fetch-media.cjs and deploy/media-release-manifest.json to stage/media-manifest.json. Stage .gitignore excludes media-exam/media-extra, not the manifest. Large media is fetched during build from the working public instance. Never upload .env, queue persistence files, smoke tokens or local learner data.

Upload: `railway up deploy/railway-release --path-as-root --service toeic-compass --detach --json`. Inspect exact deployment logs using ID (default logs show latest SUCCESS, which may be an older build). `/api/health/ready` checks Postgres/Redis, not imported media completeness.

Current AI: Gemini configured; ASR disabled. Local Whisper model was not published; prepared transcripts are retained. Smoke account uses example.invalid with a random discarded password; its local bearer session is in ignored backend/storage/deploy-check for verification only, not in release uploads.
