# Adaptive entry assessment v1

Route `/placement` is linked from the exam catalog. It is a rules-based diagnostic, not a calibrated IRT CAT, a CEFR certificate, or a TOEIC score estimator. No new training or relabeling of the application's skill taxonomy is claimed.

## Assessment policy

The blueprint targets Part counts 3/5/6/6/8/4/8 (40 questions). Complete testlets can increase the total to 42. The server uses subset-sum feasibility checks before issuing a group so an early choice cannot make the remaining blueprint impossible. There is no precision-based stopping claim. Forty minutes is an absolute session deadline; buffering, closing the browser, and switching tabs do not extend it. Unanswered questions on expiry are not fabricated as incorrect events.

Each new attempt receives a random seed. Question groups are selected deterministically for that attempt from eligible candidates, preferring unseen groups from the learner's last ten placement attempts. No question repeats within an attempt; a duplicate complete item-set from those recent attempts is rejected. This is limited-history exposure control, not a promise of global item uniqueness or statistically equated alternate forms. A small or changed bank may require reuse or stop early with an incomplete-coverage note.

Difficulty is chosen per Part from the last six submitted responses using a smoothed success ratio `(1 + correct)/(2 + count)`: >=0.7 selects a harder relative tier, <=0.4 an easier tier, otherwise the middle tier. These are product heuristics, not estimated proficiency cutoffs. All questions in a shared group are answered before the next group is chosen.

The actual source bank has constant `MEDIUM` labels and constant legacy `itemDifficulty` within each Part. The implementation therefore uses **verified fitted DAS3H population baseline probabilities**, averaged within a group, to build relative tiers within each Part. It verifies source bridge fingerprints and rejects invalidated trained items. Tertiles do not establish an IRT difficulty scale. Missing trained coverage retains catalog labels, with the limitation displayed. In the current audited bank, Part 1 has no verified trained bridge and cannot vary its difficulty; Parts 2–7 have fitted variation. The v1 blueprint has only one Part 6 group, so it remains a neutral survey block rather than promising within-Part adjustment. `catalog.adaptiveParts` shows only Parts with variation and room for more than one group. A bank with no usable difficulty variation does not advertise an available adaptive diagnostic.

## Evidence and preferences

The user chooses FOUNDATION/BALANCED/CHALLENGE and an optional aspirational TOEIC target. These are stored separately on the user and copied to the attempt for context. They never determine diagnostic results. Downstream adaptive practice uses heuristic success-probability targets 0.85/0.75/0.65 respectively; this is preferred challenge, not a claim of optimal learning or a TOEIC conversion.

Results show observed correct/attempt counts per application skill and the number of distinct stimulus groups. Fewer than three groups is insufficient evidence. With >=3 groups, observed accuracy <0.6 is labeled needs-practice and >=0.8 promising; these preliminary labels are unvalidated rules, not mastery probabilities or confidence intervals. Unobserved skills remain unassessed. Generic links lead to the existing cross-module recommendation system, which receives the genuine response evidence through the mastery outbox.

## Frozen internal reference

After historical mastery events finish processing, a completed attempt can display expected correct counts on an internal reference set of up to ten bridge-verified questions per Part. The same model and bank version uses the same reference items. The score is the sum of DAS3H probabilities, evaluated at `completedAt + 1ms` to include the entire final response group while excluding later practice. `observedAt` records completion. The reference version changes with model or item membership/content. Compare only matching versions; missing Parts are explicit. These may be previously seen items and are not a held-out exam or a population-calibrated TOEIC form. No conversion to 990, 495, CEFR or an invented prediction interval is provided.

## Integrity and recovery

One ACTIVE attempt per user is enforced by a partial unique PostgreSQL index and a per-user transaction lock. Answers must exactly match the current issued group and revision. Identical retry requests return the current session without another event; conflicting old submissions return a conflict. Frozen question snapshots grade responses. A content/answer/skill change in the live bank expires the issued attempt rather than attaching an old response to a new item.

Public active responses never include answer keys, explanation, skill tags or future questions. Listening transcripts are removed; Part 1/2 text options are hidden because they are part of the recording. The server enforces minimum elapsed listening+rest time; this is a timing guard, not proof that a human listened. The browser persists per-revision drafts and audio progress, resumes after reload, and reconciles lost acknowledgments with the server. AI tutor and vocabulary helpers are not mounted on this route.

Submission writes the response, next group and unique mastery outbox events in one transaction. Outbox processing is reused without changing DAS3H's trained feature contract. Responses from the same submitted group have the same real server timestamp. No historical timestamps, correct labels, or synthetic learner interactions are invented.

## Local validation and rollout

Apply migrations with the existing deployment process; no seed or dataset import is needed. `node test/placement.integration.cjs` after backend build uses an isolated PostgreSQL schema and synthetic records only. It tests fresh migrations, concurrent starts, ownership, key/transcript privacy, listening timing, bad IDs, concurrent identical answers, conflicting retry, blueprint completion, outbox processing, preference persistence, retake exposure, bank edits and expiry. Jest tests cover fitted difficulty despite constant source labels, unequal group feasibility, reference cutoff, corruption fallback and practice targets. Browser tests cover setup, resume, loss recovery, results, reference refresh, expiry and absence of assistance on desktop/mobile.

The v1 rules and internal reference still require prospective evaluation, especially new learners, per-Part calibration, subgroup errors and recommendation outcomes. Do not present this implementation as a validated psychometric assessment.
