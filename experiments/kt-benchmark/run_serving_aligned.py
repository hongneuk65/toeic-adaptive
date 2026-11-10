"""Compare logistic KT features under one split, solver, and tuning budget."""
import argparse
import json
import sys
import warnings
from pathlib import Path

from common import ROOT, learner_splits, load_cohort, metrics, save, sha
from compare import paired_loss_interval, predict_das3h
import numpy as np
from scipy.sparse import hstack
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from threadpoolctl import threadpool_limits
from src.das3h_comparison import encode_history


GRID = (.01, .1, 1.)


def feature_variants(matrix, item_count, skill_count):
    """Reuse the causal encoder and remove temporal features for ablations."""
    base = item_count + skill_count
    wins = matrix[:, base:base + 5 * skill_count:5].copy()
    attempts = matrix[:, base + 5 * skill_count::5].copy()
    np.expm1(wins.data, out=wins.data)
    np.expm1(attempts.data, out=attempts.data)
    failures = attempts - wins
    failures.data = np.round(failures.data)
    failures.eliminate_zeros()
    wins.data = np.round(wins.data)
    attempts.data = np.round(attempts.data)
    static = matrix[:, :base]
    yield 'item_only', matrix[:, :item_count]
    yield 'afm_item', hstack([static, attempts], format='csr')
    yield 'pfa_item', hstack([static, wins, failures], format='csr')
    np.log1p(wins.data, out=wins.data)
    np.log1p(failures.data, out=failures.data)
    yield 'log_pfa_item', hstack([static, wins, failures], format='csr')
    yield 'das3h_all_history_only', hstack([
        static, matrix[:, base:base + 5 * skill_count:5],
        matrix[:, base + 5 * skill_count::5],
    ], format='csr')
    yield 'das3h_no_learner_id', matrix


def main(output):
    output.mkdir(parents=True, exist_ok=False)
    frame, tags, hashes = load_cohort()
    tags = {item: [] if labels == ['__UNTAGGED__'] else labels for item, labels in tags.items()}
    splits = learner_splits(frame, 42)
    masks = {name: frame.user_id.isin(users).to_numpy() for name, users in splits.items()}
    y = frame.correct.to_numpy()
    reference_path = ROOT / 'experiments/das3h-production/artifacts/own-20261019/model.json'
    reference = json.loads(reference_path.read_text(encoding='utf-8'))
    for key in ('cohort', 'projection', 'catalog'):
        if reference['sourceHashes'][key] != hashes[key]:
            raise ValueError(f'Reference source mismatch: {key}')

    print('Encoding causal features without learner IDs', flush=True)
    matrix = encode_history(frame, tags, set())
    counts = {name: {'learners': len(splits[name]), 'events': int(mask.sum())} for name, mask in masks.items()}
    report = {
        'status': 'fitting', 'seed': 42, 'counts': counts, 'sourceHashes': hashes,
        'codeHashes': {'runner': sha(__file__), 'encoder': sha(sys.modules[encode_history.__module__].__file__)},
        'referenceVersion': reference['version'], 'referenceSha256': sha(reference_path),
        'protocol': 'learner-disjoint 70/15/15; strict pre-submit features; no fitted learner IDs in new fits',
        'fit': {'solver': 'liblinear', 'penalty': 'l2', 'maxIter': 1000, 'tolerance': 1e-5, 'C': GRID,
                'scale': 'divide each column by max(1, max_abs_train / 10)'},
        'models': {},
    }
    save(output / 'report.json', report)
    selected = {}
    skill_count = len({tag for labels in tags.values() for tag in labels})
    # Choose all fits on validation before evaluating any of them on test.
    for name, features in feature_variants(matrix, len(tags), skill_count):
        train_x, val_x = features[masks['train']], features[masks['val']]
        # Preserve binary item/skill indicators; condition large count columns.
        scale = 1 / np.maximum(1, abs(train_x).max(axis=0).toarray().ravel() / 10)
        train_x = train_x.multiply(scale).tocsr()
        val_x = val_x.multiply(scale).tocsr()
        trials, candidates = [], []
        for c in GRID:
            estimator = LogisticRegression(C=c, solver='liblinear', max_iter=1000, tol=1e-5, random_state=42)
            with threadpool_limits(limits=1), warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter('always', ConvergenceWarning)
                estimator.fit(train_x, y[masks['train']])
            converged = not any(issubclass(w.category, ConvergenceWarning) for w in caught)
            validation = metrics(y[masks['val']], estimator.predict_proba(val_x)[:, 1])
            trials.append({'C': c, 'validationLogLoss': validation['log_loss'], 'converged': converged,
                           'iterations': int(estimator.n_iter_[0])})
            print(f'{name}: {trials[-1]}', flush=True)
            if converged:
                candidates.append((validation['log_loss'], c, estimator))
        if not candidates:
            report['models'][name] = {'trials': trials}
            save(output / 'report.json', report)
            raise RuntimeError(f'No converged fit for {name}')
        _, c, estimator = min(candidates, key=lambda item: (item[0], item[1]))
        selected[name] = (estimator, scale)
        report['models'][name] = {'selectedC': c, 'trials': trials}
        save(output / 'report.json', report)

    print('Scoring frozen fits on the held-out learners', flush=True)
    test = frame[masks['test']]
    baseline = predict_das3h(test, reference)
    baseline_metrics = metrics(test.correct, baseline)
    for key in ('auc', 'log_loss', 'brier', 'accuracy'):
        if abs(baseline_metrics[key] - reference['metrics']['own_das3h'][key]) > 1e-9:
            raise ValueError(f'DAS3H reference did not reproduce: {key}')
    report['currentDas3h'] = baseline_metrics
    predictions = {}
    for name, features in feature_variants(matrix, len(tags), skill_count):
        estimator, scale = selected[name]
        p = estimator.predict_proba(features[masks['test']].multiply(scale).tocsr())[:, 1]
        predictions[name] = p
        report['models'][name].update(test=metrics(test.correct, p),
                                      paired=paired_loss_interval(test, p, baseline))
    report['windowAblation'] = paired_loss_interval(
        test, predictions['das3h_all_history_only'], predictions['das3h_no_learner_id'])
    report['status'] = 'complete'
    save(output / 'report.json', report)
    print(json.dumps({name: result['test'] for name, result in report['models'].items()}), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True, type=Path)
    main(parser.parse_args().output)
