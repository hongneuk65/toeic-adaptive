# Fitted OWN-tag DAS3H

`das3h-own-v1.json` is the deployed inference artifact. It contains fitted coefficients,
EdNet question/tag metadata and a fingerprint bridge to verified local questions. It
contains no learner IDs, per-learner training coefficients or interaction logs.

Enable with `DAS3H_MODEL_PATH=models/das3h-own-v1.json` after migrations. Remove this
setting and restart to roll back to the legacy heuristic. New learner ability offsets
and observations live in dedicated version-aware tables; legacy ability is preserved.

Artifacts trained on a different feature contract are rejected. Edited/unmatched
questions fall back instead of receiving another item's coefficients. To deploy to a
database with different question content, regenerate the application bridge with
`scripts/activate-das3h.cjs` while learning writes are stopped. Keep the training parity
fixture beside the input model. The script can be rerun without duplicating backfill.

Reproduction and evaluation: [training documentation](../../experiments/das3h-production/README.md).
