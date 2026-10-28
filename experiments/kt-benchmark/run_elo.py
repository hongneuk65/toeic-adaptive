"""Held-out learner Elo evaluation, matching a verified logistic run."""
import argparse
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--data-root', type=Path, required=True)
parser.add_argument('--comparison', type=Path, required=True)
args = parser.parse_args()
sys.path.insert(0, str(args.data_root / 'experiments/kt-benchmark/.runtime'))
import common
common.ROOT = args.data_root
from common import load_cohort, learner_splits, metrics, save, sha
from compare import predict_das3h, paired_loss_interval
from elo import run

def main():
    output = args.comparison.parent / 'elo-report.json'
    if output.exists():
        raise FileExistsError('Elo report already exists')
    reference = json.loads(args.comparison.read_text())
    if 'das3h' not in reference:
        raise ValueError('A verified DAS3H reference is required')
    df, tags, hashes = load_cohort()
    if reference['sourceHashes'] != hashes or reference['seed'] != 42:
        raise ValueError('Comparison source mismatch')
    splits = learner_splits(df)
    frames = {name: df[df.user_id.isin(users)].copy() for name, users in splits.items()}
    counts = {name: {'learners': len(splits[name]), 'events': len(frame)} for name, frame in frames.items()}
    if reference['counts'] != counts:
        raise ValueError('Reference event denominator mismatch')
    # Global chronology is essential while item parameters are learned online.
    train = frames['train'].sort_values(['timestamp', 'user_id', 'question_id'], kind='stable')
    trials, candidates = [], []
    for k in (.025, .1, .4):
        print(f'Elo: fitting K={k}', flush=True)
        _, items = run(train, tags, k, fit=True)
        val, _ = run(frames['val'], tags, k, items)
        score = metrics(frames['val'].correct, val)
        trials.append({'k': k, 'validation': score})
        candidates.append((score['log_loss'], k, items))
    _, k, items = min(candidates, key=lambda candidate: (candidate[0], candidate[1]))
    test = frames['test']
    prediction, _ = run(test, tags, k, items)
    artifact = json.loads((args.data_root / 'experiments/das3h-production/artifacts/own-20261019/model.json').read_text())
    for key in ('cohort', 'projection', 'catalog'):
        if artifact['sourceHashes'][key] != hashes[key]:
            raise ValueError('DAS3H artifact source mismatch')
    baseline = predict_das3h(test, artifact)
    check = metrics(test.correct, baseline)
    for key in ('auc', 'log_loss', 'brier', 'accuracy'):
        if abs(check[key] - reference['das3h']['metrics'][key]) > 1e-9:
            raise ValueError('Reference reproduction mismatch')
    # Cold-start bands use complete-submit boundaries.
    prior = test.groupby('user_id', sort=False).cumcount()
    prior = prior.groupby([test.user_id, test.timestamp], sort=False).transform('min')
    bands = {name: metrics(test.correct.to_numpy()[mask], prediction[mask])
        for name, mask in [('first_10', (prior < 10).to_numpy()),
            ('10_to_49', ((prior >= 10) & (prior < 50)).to_numpy()),
            ('50_plus', (prior >= 50).to_numpy())] if mask.any()}
    report = {'status': 'complete', 'model': 'binary_skill_elo', 'seed': 42,
        'sourceHashes': hashes, 'counts': reference['counts'], 'selectedK': k,
        'trials': trials, 'metrics': metrics(test.correct, prediction), 'slices': bands,
        'paired': paired_loss_interval(test, prediction, baseline),
        'implementationHashes': {name: sha(Path(__file__).parent / name)
            for name in ('common.py', 'event_blocks.py', 'elo.py', 'run_elo.py', 'compare.py')},
        'caveat': 'Binary skill Elo adaptation; not Math Garden response-time scoring; items frozen in validation/test'}
    save(args.comparison.parent / 'elo-items.json', items)
    save(output, report)
    print(json.dumps(report, ensure_ascii=False), flush=True)

if __name__ == '__main__':
    main()
