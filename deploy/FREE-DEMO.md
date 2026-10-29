# Free demo deployment

Use a Render Free Node web service and Free Key Value in the same region, plus Neon Free PostgreSQL and private object storage. Preserve old environments until verification finishes. Use Node 24.22.1.

Build from repository root:

```sh
npm ci --prefix backend --include=dev && npm --prefix backend run db:generate && npm --prefix backend run build && npm ci --prefix frontend --include=dev && npm --prefix frontend run build && node deploy/prepare-free-demo.cjs
```

Start: `cd backend && node scripts/boot-production.cjs`.
Health check: `/api/health/ready` checks PostgreSQL and queue connectivity.

## Environment

Set `NODE_ENV=production`, `SERVE_FRONTEND=1`, `VITE_API_URL=/api`, `FRONTEND_URL` to the public HTTPS origin, `TRUST_PROXY=1`, and a generated `JWT_SECRET`. Configure `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT` and optional Redis authentication through secret settings. Use the internal Redis connection without opening external access.

Set `LISTENING_ASR_ENABLED=false` for this small demo instance. Existing transcripts and audio work independently; server-side transcription needs a suitable worker. Private object storage uses `AWS_ENDPOINT_URL_S3`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `MEDIA_S3_BUCKET`. New administrator media uploads persist under `uploads/listening/` and keep the existing application URL and range playback support.

## Private library release

Create a files-only tar.gz containing allowlisted `storage/exam/` content-addressed assets, `storage/dictionary/en-vi.json.gz` plus license/attribution, `models/das3h-own-v1.json`, and `prisma/public-library.json.gz`. Include `demo-assets.manifest.json`: an array of `{ "path": "...", "sha256": "..." }` for every other file. The fetch script rejects unexpected paths, links and directories and verifies every file. Never commit archives, private manifests, model artifacts or environment files.

Export shared learning content using `backend/scripts/export-public-content.cjs`; learner accounts, attempts and review histories are excluded. Do not package local databases or private recordings.

For storage object limits, split the completed archive into binary chunks below the provider limit, named `<DEMO_ASSET_KEY>.part01`, `.part02`, etc. Set `DEMO_ASSET_PARTS` to the count and `DEMO_ASSET_SHA256` to SHA256 of the complete original archive. `DEMO_ASSET_KEY` must match `release/<name>.tar.gz`. One object uses `DEMO_ASSET_PARTS=1` and the unsuffixed key. The build streams chunks to disk and verifies the complete checksum before extraction.

Set `EXAM_MEDIA_DIR=storage/exam`, `VOCABULARY_DICTIONARY_PATH=storage/dictionary/en-vi.json.gz`, and `DAS3H_MODEL_PATH=models/das3h-own-v1.json`. Boot applies migrations and imports only into an empty catalog. Preserve question content/IDs matching the trained artifact and verify trained placement coverage.

## Limits and validation

Free services sleep while idle and need time to wake. PostgreSQL is durable; the free queue is ephemeral. Keep the existing PostgreSQL mastery outbox enabled. Persist uploads in object storage; immutable assets are restored at build time. Monitor free quotas; this setup never upgrades plans automatically.

Verify readiness, registration/login, placement, recommendations, dictionary lookup, and audio returning `206 Partial Content`. The new database does not contain previous user accounts or learning histories.
