# EdNet: DAS3H / GRU / DAS3H + GRU

Offline pilot only. This does not modify the application, database, scheduler or original EdNet files.

## Data and causal protocol

Source: [Riiid EdNet documentation](https://github.com/riiid/ednet). The available local source is the original `KT4.zip` and `contents/questions.csv`. Do not treat every `respond` as a completed attempt: users can change an answer. The parser keeps the last response per question between the matching bundle `enter` and `submit`. Unsubmitted attempts, responses outside a matching bundle and unknown question IDs are excluded and counted in the manifest. Question tags and correct answers come from the supplied content table. Audio/payment/lecture events are ignored in this comparison.

Predict all questions in a bundle from history preceding its `enter`; reveal all their outcomes only after `submit`. GRU history is pooled at bundle level, so no arbitrary question ordering exposes answers within a bundle. Time-window features use previous submission timestamps. Current response time, current answer, future answers and future correctness rates are not input features.

Select learners by shuffling the sorted archive filenames with seed 20261017, taking the first 2,000 with at least 20 valid submitted bundles. Keep each selected learner's first 200 valid bundles. This deliberately excludes short histories and caps long ones; the result is not representative of all EdNet learners. Selected filenames and sampling audit are saved.

Split each learner's bundles chronologically into approximately 70% train / 15% validation / 15% test, keeping bundles intact. This is **warm-start, within-learner evaluation**, not a global date split or a test of entirely new learners. The model weights are fixed during evaluation, while earlier validation/test answers become history after their bundles are submitted. Question/tag vocabulary and all fitted weights use training prefixes only; unseen items/tags use OOV handling. Ground-truth answers in metadata are used only to form labels.

## Models

1. **DAS3H_d0_fitted:** L2 logistic regression with learner bias, question bias, sum of skill biases, and skill-specific log(1+wins) / log(1+attempts) features in cumulative 1h, 1d, 7d, 30d and all-history windows. Logistic C is chosen from 0.01, 0.1, 1 and 10 by validation log loss. It implements the d=0 feature formulation; it is not the production heuristic or a reproduction of all experimental settings in the paper.
2. **GRU:** item/tag target embeddings and response-conditioned history embeddings (16 dimensions); bundle-mean history; unidirectional GRU hidden size 32; learner embedding 8; current time gap; MLP head 64 with ReLU/dropout 0.1. Predictions use the state after the previous bundle. No DAS3H counts/logits are supplied.
3. **DAS3H_GRU_residual:** exactly the same GRU architecture, plus the frozen fitted DAS3H logit: `sigmoid(z_DAS3H + z_GRU)`. The residual output layer starts at zero. This is an experimental residual hybrid, not a claim to reproduce RKTM. DAS3H coefficients stay frozen; GRU learns a correction on training prefixes. The correction is fitted on in-sample baseline logits, not out-of-fold stacking; the separate held-out test remains untouched by training.

Neural runs: seeds 11/22/33, AdamW lr 0.002, weight decay 0.0001, gradient clip 5, batch size 32, at most 12 epochs, patience 3; select epoch by validation log loss. This is a bounded pilot, not equal-budget exhaustive hyperparameter optimization. Baseline C search and neural epoch selection use no test metrics. Models have different capacity and compute cost.

## Metrics and interpretation

Primary: held-out log loss (lower is better); secondary: ROC-AUC (higher), Brier (lower), accuracy at 0.5, and 10-bin equal-width ECE. Report mean and population SD over neural seeds, not just the best seed. DAS3H is deterministic here, so it has one fit. Also report seed-mean ensembles separately; do not present their metrics as single-model results.

Paired learner bootstrap (300 resamples) compares **seed-mean ensemble** predictions for hybrid minus each baseline; it measures test-learner sampling uncertainty conditional on these trained models, not uncertainty over training seeds. AUC CI above zero and log-loss CI below zero support an improvement in this pilot; mixed results should be reported as mixed. These are exploratory comparisons, not a preregistered confirmatory statistical test.

This benchmark measures next-bundle answer prediction on EdNet, not increased TOEIC scores, memory retention, or better scheduling. EdNet tags are not yet mapped/validated against the application's micro-skills. A larger independent sample, broader tuning, cold-start tests and policy evaluation are still needed before a production decision.

## Run

Python 3.12 with numpy, scipy, scikit-learn and CPU PyTorch is available on the surveyed machine. Exact runtime versions, command arguments and script hash are written to `environment.json`.

```powershell
& 'C:/Users/vanho/AppData/Local/Programs/Python/Python312/python.exe' -m unittest discover -s experiments/ednet -p test_benchmark.py -v

& 'C:/Users/vanho/AppData/Local/Programs/Python/Python312/python.exe' -u experiments/ednet/benchmark.py `
  --data 'D:/NEU/KHOA_LUAN/DAS3H&BKT&SAKT/data/ednet_kt4/KT4.zip' `
  --questions 'D:/NEU/KHOA_LUAN/DAS3H&BKT&SAKT/data/ednet_kt4/contents/contents/questions.csv' `
  --output experiments/ednet/artifacts/pilot-2000 `
  --users 2000 --max-bundles 200 --epochs 12 --seeds 11 22 33
```

Large artifacts (prepared data, model weights and per-event predictions) are ignored by Git under `artifacts/`. `results.json` contains all runs, selection histories and uncertainty calculations. `manifest.json` describes the sample and extraction audit. A smoke run verifies execution only and must not be used as scientific evidence.

After training completes, audit and render the saved results:

```powershell
& 'C:/Users/vanho/AppData/Local/Programs/Python/Python312/python.exe' experiments/ednet/audit.py --input experiments/ednet/artifacts/pilot-2000
& 'C:/Users/vanho/AppData/Local/Programs/Python/Python312/python.exe' experiments/ednet/report.py --input experiments/ednet/artifacts/pilot-2000 --output docs
```

The report command verifies metrics against saved predictions before exporting a PNG/PDF scientific figure, readable Vietnamese report and small JSON records. Do not compare the smoke result to the main experiment: its sample size differs. Prepared data are cached by configuration; use a new output directory if source files or preprocessing change. The original main-run script is preserved as `benchmark.source.py` alongside its SHA-256 runtime record.

## Research basis

- [DAS3H, Choffin et al. (2019)](https://arxiv.org/html/1905.06873), sections 4–5.
- [GRU origin, Cho et al. (2014)](https://aclanthology.org/D14-1179/).
- [RKTM, Lai et al. (2021)](https://onlinelibrary.wiley.com/doi/10.1111/exsy.12782), architectural precedent; not reproduced here.
- [Gervet et al. (2020)](https://theophilegervet.github.io/assets/pdf/gervet2020deep.pdf), dataset dependence and fair learner-performance comparisons.
