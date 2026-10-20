# Production library snapshot

`public-library.json.gz` bootstraps an empty production database. Existing content is retained on restart. It contains shared learning content only, exported with `scripts/export-public-content.cjs`; learner accounts, answers, chats and review history are excluded. Folder ownership is assigned to a new disabled library account during import.

SHA-256: `e37fe8d880295343bdd9b30bbc46cca48e8dded1128bae967999514cd89df777`.

Contents: 40 skills, 5,049 questions, 5,084 question-skill links, 114 theory lessons, 15 knowledge chunks, 196 reading articles, 261 reading versions, 20 vocabulary folders, 854 flashcards, 1,578 listening sources, 915 prepared transcripts and 925 listening units.

Media is fetched separately during the image build using `deploy/media-release-manifest.json`, with SHA-256 verification. A full recovery with no live media source requires the original media files.
