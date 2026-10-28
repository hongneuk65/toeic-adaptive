"""Train on train, select C on validation, evaluate test once. Private output."""
import argparse
import json
import sys
import time
import warnings
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--data-root', type=Path, required=True)
parser.add_argument('--output', type=Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.data_root / 'experiments/kt-benchmark/.runtime'))
import common
common.ROOT = args.data_root
from common import load_cohort, learner_splits, metrics, save, sha
from logistic import features, MODELS
from compare import predict_das3h, paired_loss_interval
import numpy as np
from sklearn.feature_extraction import DictVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.exceptions import ConvergenceWarning
from sklearn.preprocessing import StandardScaler
from scipy.special import expit
from threadpoolctl import threadpool_limits

def slices(frame, predictions):
    # Count responses strictly before each submit, not siblings in the batch.
    prior = frame.groupby('user_id', sort=False).cumcount().to_numpy()
    starts = frame.groupby(['user_id', 'timestamp'], sort=False).indices
    for indices in starts.values():
        prior[indices] = prior[indices].min()
    return {name: metrics(frame.correct.to_numpy()[mask], predictions[mask])
            for name, mask in [('first_10', prior < 10), ('10_to_49', (prior >= 10) & (prior < 50)),
                               ('50_plus', prior >= 50)] if mask.any()}

def main():
    if args.output.exists():
        raise FileExistsError('Use a new private output directory')
    args.output.mkdir(parents=True)
    df, tags, hashes = load_cohort()
    splits = learner_splits(df, 42)
    frames = {name: df[df.user_id.isin(users)].copy() for name, users in splits.items()}
    ref_dir = args.data_root / 'experiments/das3h-production/artifacts/own-20261019'
    reference = json.loads((ref_dir / 'training-report.json').read_text())
    artifact = json.loads((ref_dir / 'model.json').read_text())
    counts = {name: {'learners': len(splits[name]), 'events': len(frame)} for name, frame in frames.items()}
    for record in (reference, artifact):
        for key in ('cohort', 'projection', 'catalog'):
            if record['sourceHashes'][key] != hashes[key]:
                raise ValueError('Reference source mismatch: ' + key)
    if reference['seed'] != 42 or reference['counts'] != counts:
        raise ValueError('Reference split mismatch')
    test = frames['test']
    baseline = predict_das3h(test, artifact)
    baseline_metrics = metrics(test.correct, baseline)
    for key in ('auc', 'log_loss', 'brier', 'accuracy'):
        if abs(baseline_metrics[key] - reference['metrics']['own_das3h'][key]) > 1e-9:
            raise ValueError('DAS3H reproduction mismatch')
    report = {'status': 'running', 'seed': 42, 'sourceHashes': hashes, 'counts': counts,
              'protocol': 'learner-disjoint; all timestamp predictions before any update; validation-only C selection',
              'implementationHashes': {name: sha(Path(__file__).parent / name)
                  for name in ('common.py', 'event_blocks.py', 'logistic.py', 'run_logistic.py', 'compare.py')},
              'das3h': {'metrics': baseline_metrics, 'slices': slices(test, baseline)}, 'models': {}}
    save(args.output / 'report.json', report)
    for name in MODELS:
        print(name + ': building causal features', flush=True)
        start = time.perf_counter()
        vectorizer = DictVectorizer()
        train_x = vectorizer.fit_transform(features(frames['train'], tags, name))
        val_x = vectorizer.transform(features(frames['val'], tags, name))
        # Sparse train-only scaling improves conditioning of raw count features.
        # This changes the L2 penalty geometry, declared in the protocol.
        scaler = StandardScaler(with_mean=False)
        train_x = scaler.fit_transform(train_x)
        val_x = scaler.transform(val_x)
        trials, candidates = [], []
        for c in (.01, .1, 1.):
            print(f'{name}: fitting C={c}', flush=True)
            estimator = LogisticRegression(C=c, solver='lbfgs', max_iter=1000, tol=1e-5)
            with warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter('always', ConvergenceWarning)
                with threadpool_limits(limits=2):
                    estimator.fit(train_x, frames['train'].correct)
            converged = not any(issubclass(w.category, ConvergenceWarning) for w in caught)
            score = metrics(frames['val'].correct, estimator.predict_proba(val_x)[:, 1])
            trials.append({'C': c, 'converged': converged, 'iterations': int(estimator.n_iter_[0]), 'validation': score})
            if converged:
                candidates.append((score['log_loss'], c, estimator))
        if not candidates:
            report['status'] = 'failed'
            report['models'][name] = {'trials': trials, 'reason': 'no converged candidate; test not evaluated'}
            save(args.output / 'report.json', report)
            raise RuntimeError(name + ': no converged validation candidate; do not evaluate test')
        _, selected_c, selected = min(candidates, key=lambda entry: (entry[0], entry[1]))
        test_x = vectorizer.transform(features(test, tags, name))
        prediction = selected.predict_proba(scaler.transform(test_x))[:, 1]
        # Numeric parameters and feature names stay private; no learner histories.
        parameter_path = args.output / (name + '.npz')
        np.savez_compressed(parameter_path, coefficients=selected.coef_ / scaler.scale_,
                            intercept=selected.intercept_, features=vectorizer.get_feature_names_out().astype(str))
        with np.load(parameter_path, allow_pickle=False) as restored:
            reloaded = expit(np.asarray(test_x @ restored['coefficients'].T).ravel() + restored['intercept'][0])
            np.testing.assert_allclose(prediction, reloaded, atol=1e-12, rtol=0)
        report['models'][name] = {'selectedC': selected_c, 'trials': trials,
            'metrics': metrics(test.correct, prediction), 'slices': slices(test, prediction),
            'paired': paired_loss_interval(test, prediction, baseline),
            'seconds': time.perf_counter()-start}
        save(args.output / 'report.json', report)
        print(json.dumps({'model': name, **report['models'][name]}, ensure_ascii=False), flush=True)
    report['status'] = 'complete'
    save(args.output / 'report.json', report)

if __name__ == '__main__':
    main()
