"""Recompute held-out metrics from saved parameters, without training."""
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--data-root', type=Path, required=True)
parser.add_argument('--report', type=Path, required=True)
parser.add_argument('--elo-report', type=Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.data_root / 'experiments/kt-benchmark/.runtime'))
import common
common.ROOT = args.data_root
from common import load_cohort, learner_splits, metrics, sha
from logistic import features, MODELS
from elo import run
import numpy as np
from scipy.special import expit
from sklearn.feature_extraction import DictVectorizer

def main():
    reports = [json.loads(path.read_text()) for path in (args.report, args.elo_report)]
    df, tags, hashes = load_cohort()
    test = df[df.user_id.isin(learner_splits(df)['test'])]
    for report in reports:
        if report['status'] != 'complete' or report['sourceHashes'] != hashes or report['seed'] != 42:
            raise ValueError('Incomplete or incompatible report')
        for name, expected in report['implementationHashes'].items():
            if sha(Path(__file__).parent / name) != expected:
                raise ValueError('Source changed: ' + name)
    results = {}
    for name in MODELS:
        with np.load(args.report.parent / (name + '.npz'), allow_pickle=False) as saved:
            names = saved['features'].tolist()
            vectorizer = DictVectorizer()
            vectorizer.feature_names_ = names
            vectorizer.vocabulary_ = {feature: index for index, feature in enumerate(names)}
            x = vectorizer.transform(features(test, tags, name))
            prediction = expit(np.asarray(x @ saved['coefficients'].T).ravel() + saved['intercept'][0])
        results[name] = metrics(test.correct, prediction)
        expected = reports[0]['models'][name]['metrics']
        for key in ('auc', 'log_loss', 'brier', 'accuracy', 'events'):
            # Converting scaled coefficients to original units changes a few
            # saturated-probability ties at machine precision. AUC is rank based.
            tolerance = 1e-8 if key == 'auc' else 1e-10
            if abs(results[name][key] - expected[key]) > tolerance:
                raise ValueError(f'Artifact metrics mismatch: {name}/{key}: {results[name][key]} vs {expected[key]}')
    items = json.loads((args.elo_report.parent / 'elo-items.json').read_text())
    prediction, _ = run(test, tags, reports[1]['selectedK'], items)
    results['elo'] = metrics(test.correct, prediction)
    for key in ('auc', 'log_loss', 'brier', 'accuracy', 'events'):
        if abs(results['elo'][key] - reports[1]['metrics'][key]) > 1e-10:
            raise ValueError('Elo artifact metrics mismatch: ' + key)
    print(json.dumps({'status': 'verified', 'models': results}, indent=2))

if __name__ == '__main__':
    main()
