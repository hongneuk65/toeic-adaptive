# OWN-tag DAS3H: training and application integration

The active model is **DAS3H d=0**, a fitted sparse logistic model with cumulative
skill windows. It is not the old disjoint win/loss heuristic, a GRU hybrid, or a
claim to reproduce every setting in the original paper. Feature reference:
https://github.com/BenoitChoffin/das3h .

## Data and evaluation

- Frozen mapping: `ednet_santa_mapping_clean/outputs/ednet_with_own_tags.json`, 92
  OWN content labels on the 13,169-question EdNet catalog. Original data/mapping
  files are read only. The mapping's status remains `research_candidate_not_final`;
  there is no independent semantic gold validation, especially for Part 1 anchors.
- Reuses the mapping experiment's audited cohort of **3,000 learners / 413,744
  completed question responses**, with their uncapped submitted histories. This
  is not all learners in KT4. The last response before a matching submit forms
  the label; windows see only earlier submission timestamps. Same-timestamp
  bundle responses cannot see each other's outcomes. The cache does not retain
  enter timestamps, so this is prediction at submission time, not an enter-time
  deployment-policy evaluation.
- Seed 42, learner-disjoint 70/15/15: 2,100/450/450 learners and
  281,250/66,647/65,847 events. Test users have no fitted learner intercept.
  Earlier responses of a validation/test user become history causally.
- Fit `C ∈ {0.1,1,10}` by validation log loss, select only converged fits. The held-out
  test is evaluated once per selected variant; the release gate compares fixed
  own-model and item-only log losses, without retuning on test. This is the same
  previously studied cohort, not a fresh external replication or multi-seed CI.

| Variant | Selected C | Validation log loss | Test AUC | Test log loss | Brier | Accuracy |
| --- | --- | --- | --- | --- | --- | --- |
| Item-only baseline | 1 | 0.599904 | 0.698846 | 0.588978 | 0.201816 | 0.686774 |
| OWN DAS3H d=0 | 1 | 0.584557 | 0.703701 | 0.579725 | 0.197895 | 0.695339 |

Version: `own-das3h-00d43658677e8319`. Fit runtime approximately 245 seconds.
Exact aggregate metrics, C search and source hashes are in
`artifacts/own-20261019/training-report.json` (large/private artifacts ignored).
No claim that these prediction metrics establish improved TOEIC learning outcomes.

## Runtime feature contract

`sigmoid(intercept + item_bias + online_ability + Σ skill_bias +
Σ theta_win × log1p(wins) + Σ theta_attempt × log1p(attempts))`.

Windows are `[all history, 30 days, 7 days, 1 day, 1 hour]`, with strict bounds
`now-window < observedAt < now`. Features sum across OWN tags. They must not be
averaged or interpreted as wins/losses in the legacy five disjoint intervals.
Sixty-four anonymous numerical fixtures match Python and TypeScript with maximum
absolute probability error **1.39e-16**. No training learner identifiers or fitted
learner intercepts are exported to the application.

## Deployment and scope

`backend/models/das3h-own-v1.json` is an approximately 1.8 MB portable artifact.
Deployment resolves original `[santa-ednet:q…]` IDs, checks Part and the answer
key, then freezes a content/option/answer fingerprint. Only that verified bank
snapshot is eligible. An admin content edit makes that question fall back until
the source bridge has been reverified. No relabeling of the app's 42 micro-skills
as the 92 OWN IDs is performed.

This local bank has **3,633 eligible source questions**: Part 2 538; Part 3 573;
Part 4 606; Part 5 716; Part 6 728; Part 7 472. Another 1,416 source-marked rows
could not meet all checks. In particular there is no verified EdNet-ID bridge for
the local Part 1 content, so it retains the legacy engine. The tag proposal's
Part 1 coverage alone does not establish a question-level bridge.

- Adaptive selection and `/das3h/predict` use the trained probability for eligible
  questions; unsupported/edited questions retain legacy scoring.
- Mastery profile, RAG roadmap and explanations use averages of trained question
  probabilities within each existing app micro-skill when eligible questions
  exist. `scoreSource=trained-own-question-average` identifies this projection;
  it is not a directly validated percentage of skill mastery. No observed
  responses still means `evidenceStatus=unassessed`.
- `TrainedDas3hState` keeps online ability per user and model version. Legacy
  `User.ability` continues updating separately for fallback/rollback.
- `TrainedDas3hObservation` stores one response per actual event, independent of
  how many app micro-skills a question has. New direct answers and durable outbox
  updates are transactional/idempotent. Activation deduplicates historical
  micro-skill rows; four eligible legacy observations were backfilled here.
- Reading documents, standalone listening exercises and flashcards still do not
  create DAS3H observations; their responses lack this source/question contract.
- Authenticated `GET /das3h/status` exposes version, mapping status and aggregate
  metrics. Startup rejects a configured incompatible artifact.

Local activation was verified through the running API: readiness and model status
returned HTTP 200; 31/42 existing micro-skills had a trained question-average score.
Adaptive selection returned `predictionSource=trained-own-das3h` and the exact
active model version. Local `.env` has the model enabled and the backend is running.

## Reproduce locally

From the repository root, with the existing Python 3.12 numpy/pandas/scipy/sklearn
environment:

```powershell
& 'C:/Users/vanho/AppData/Local/Programs/Python/Python312/python.exe' -u experiments/das3h-production/train.py
npm run db:generate --prefix backend
npm run db:migrate --prefix backend
npm run build --prefix backend
```

While learning writes are stopped, from `backend/`:

```powershell
node --env-file=.env scripts/activate-das3h.cjs
node --env-file=.env test/trained-das3h.integration.cjs
```

Set `DAS3H_MODEL_PATH=models/das3h-own-v1.json` in backend `.env`, then restart.
Relative model paths resolve from the backend root. The activation script checks
Python/TypeScript parity before backfilling and writing the deployable artifact.
Rerunning it skips existing observations. Docker includes the model directory;
another environment must regenerate/verify its own bank bridge.

To roll back, clear `DAS3H_MODEL_PATH` and restart. Do not drop learning tables or
overwrite the old coefficients. New weight versions start with a separate online
ability state while retaining compatible source-catalog observations.

Validation: 221 backend unit tests passed, including six new inference-contract
cases. The live PostgreSQL acceptance test uses an isolated schema and checks
trained prediction, initial ability isolation, single-response counting,
idempotent retries, skill-profile projection, outbox consumption, edited-content
fallback and rollback. It drops only its randomly named test schema.
