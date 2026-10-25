# Production library snapshot

`public-library.json.gz` is a private deployment artifact and must not be committed. Provision it in this directory through a private build context before building a release. It bootstraps an empty production database; existing content is retained on restart. Learner accounts, answers, chats and review history are excluded. Folder ownership is assigned to a new disabled library account during import.

Media is fetched separately during the image build using the private `deploy/media-release-manifest.json`, with SHA-256 verification. Provision that file privately as well. A fresh Git checkout alone is not a complete production build context. A full recovery with no live media source requires the original media files. Keep checksums and inventories alongside the private artifacts.
