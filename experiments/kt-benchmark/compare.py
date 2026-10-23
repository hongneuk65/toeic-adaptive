"""Verify frozen DAS3H compatibility before collecting benchmark reports."""
from __future__ import annotations
import argparse
import json
from bisect import bisect_right
from collections import defaultdict
import math
from pathlib import Path
from common import ROOT, HERE, blocks, load_cohort, learner_splits, metrics, save, sha
import numpy as np
import pandas as pd

def paired_loss_interval(frame, candidate, reference, repeats=1000, seed=42):
    """Resample learners, keeping all their correlated responses together."""
    y = frame.correct.to_numpy()
    def loss(p):
        p = np.clip(p, 1e-7, 1-1e-7)
        return -(y*np.log(p) + (1-y)*np.log1p(-p))
    difference = loss(candidate) - loss(reference)
    users = frame.user_id.to_numpy()
    sums, counts = [], []
    for user in sorted(set(users)):
        mask = users == user
        sums.append(difference[mask].sum())
        counts.append(mask.sum())
    sums, counts = np.array(sums), np.array(counts)
    sample = np.random.default_rng(seed).integers(0, len(sums), (repeats, len(sums)))
    delta = sums[sample].sum(axis=1) / counts[sample].sum(axis=1)
    return {'deltaLogLossCandidateMinusDas3h': float(difference.mean()),
            'ci95': [float(x) for x in np.quantile(delta, [.025, .975])],
            'repeats': repeats, 'unit': 'paired learner cluster', 'seed': seed}

def predict_das3h(df, artifact):
    predictions = pd.Series(index=df.index, dtype=float)
    user, wins, counts = None, defaultdict(list), defaultdict(list)
    for group in blocks(df):
        uid, now = group.user_id.iloc[0], int(group.timestamp.iloc[0])
        if uid != user:
            user, wins, counts = uid, defaultdict(list), defaultdict(list)
        for row in group.itertuples():
            item = artifact['questions'][row.question_id]
            logit = artifact['intercept'] + item['bias']
            for tag in item['tags']:
                weights = artifact['skills'][tag]
                logit += weights['bias']
                for kind, history in [('wins', wins[tag]), ('attempts', counts[tag])]:
                    for i, window in enumerate(artifact['windowsMs']):
                        start = 0 if window is None else bisect_right(history, now-window)
                        logit += weights[kind][i] * math.log1p(len(history)-start)
            predictions.at[row.Index] = 1/(1+math.exp(-logit))
        for row in group.itertuples():
            for tag in artifact['questions'][row.question_id]['tags']:
                counts[tag].append(now)
                if row.correct:
                    wins[tag].append(now)
    return predictions.to_numpy()

def compare(directory):
    df, tags, hashes = load_cohort()
    reports = [json.loads((directory / f'{name}-report.json').read_text(encoding='utf-8')) for name in ['bkt','dkt']]
    for report in reports:
        if report['status'] != 'complete' or report['sourceHashes'] != hashes or report['seed'] != 42:
            raise ValueError('Reports use incompatible data or split')
        for filename in ['common.py', report['model'] + '.py']:
            if report['implementationHashes'][filename] != sha(HERE / filename):
                raise ValueError('Model method changed since training: ' + filename)
        save(directory / f'{report["model"]}-progress.json', report)
    reference_path = ROOT / 'experiments/das3h-production/artifacts/own-20261019/training-report.json'
    reference = json.loads(reference_path.read_text(encoding='utf-8'))
    if reference['seed'] != 42:
        raise ValueError('DAS3H split seed mismatch')
    for key in ['cohort','projection','catalog']:
        if reference['sourceHashes'][key] != hashes[key]:
            raise ValueError('DAS3H source mismatch: ' + key)
    if any(report['counts'] != reference['counts'] for report in reports):
        raise ValueError('Event denominator mismatch')
    artifact_path = reference_path.parent / 'model.json'
    artifact = json.loads(artifact_path.read_text(encoding='utf-8'))
    for key in ['cohort','projection','catalog']:
        if artifact['sourceHashes'][key] != hashes[key]:
            raise ValueError('DAS3H artifact mismatch: ' + key)
    test = df[df.user_id.isin(learner_splits(df)['test'])]
    das3h_predictions = predict_das3h(test, artifact)
    reproduced = metrics(test.correct, das3h_predictions)
    expected = reference['metrics']['own_das3h']
    for key in ['auc','log_loss','brier','accuracy']:
        if abs(reproduced[key] - expected[key]) > 1e-9:
            raise ValueError('Frozen DAS3H reproduction mismatch: ' + key)
    # Fixed artifacts only: recompute the already-selected models for paired
    # uncertainty, and insist their metrics match the completed run exactly.
    from bkt import predict_bkt
    from dkt import official_dkt, make_windows, collate, evaluate
    import torch
    from torch.utils.data import DataLoader
    torch.set_num_threads(2)
    bkt_predictions = predict_bkt(test, tags, json.loads((directory / 'bkt-parameters.json').read_text()))
    checkpoint = torch.load(directory / 'dkt-best.pt', map_location='cpu', weights_only=True)
    model = official_dkt()(len(checkpoint['concepts']), checkpoint['hidden'], dropout=.2)
    model.load_state_dict(checkpoint['state'])
    dkt_report = next(r for r in reports if r['model'] == 'dkt')
    windows = make_windows(test, tags, checkpoint['concepts'], dkt_report['config']['window'], dkt_report['config']['context'])
    dkt_predictions = evaluate(model, DataLoader(windows, batch_size=32, collate_fn=collate), test)
    predictions = {'bkt': bkt_predictions, 'dkt': dkt_predictions}
    for report in reports:
        actual = metrics(test.correct, predictions[report['model']])
        if any(abs(actual[k] - report['metrics']['test'][k]) > 1e-9 for k in ['auc','log_loss','brier','accuracy']):
            raise ValueError('Selected checkpoint reproduction mismatch: ' + report['model'])
    all_predictions = {'own_das3h': das3h_predictions} | predictions
    scopes = {'tagged': test.question_id.map(lambda q: tags[q] != ['__UNTAGGED__']).to_numpy()}
    scopes['untagged'] = ~scopes['tagged']
    for part in range(1, 8):
        scopes[f'part_{part}'] = test.question_id.map(lambda q: artifact['questions'][q]['part'] == part).to_numpy()
    by_scope = {scope: {name: metrics(test.correct.to_numpy()[mask], p[mask]) for name, p in all_predictions.items()}
                for scope, mask in scopes.items() if mask.any()}
    summary = {'status': 'complete', 'seed': 42, 'sourceHashes': hashes, 'counts': reference['counts'],
               'das3hArtifactHash': sha(artifact_path), 'das3hReproduced': True,
               'fixedModelHashes': {'bktParameters': sha(directory / 'bkt-parameters.json'),
                                    'dktCheckpoint': sha(directory / 'dkt-best.pt')},
               'results': {'own_das3h': reproduced} | {r['model']: r['metrics']['test'] for r in reports},
               'descriptiveSubgroups': by_scope,
               'pairedLogLoss': {name: paired_loss_interval(test, p, das3h_predictions) for name, p in predictions.items()},
               'modelDetails': {r['model']: {'environment': r['environment'], 'config': r['config'],
                   'selectedEpoch': r.get('selectedEpoch'),
                   'fitReachedLimit': sum(not d['stoppedBeforeLimit'] for d in r.get('fitDiagnostics', [])),
                   'seconds': r['seconds']} for r in reports},
               'decision': 'Research comparison only; production DAS3H is unchanged. A single seed and predictive metrics do not establish learning benefit.',
               'limitations': ['same previously studied cohort and held-out test; not a new external replication',
                              'BKT sequential fitting approximation within tied training timestamps',
                              'DKT truncated context and bounded validation-selected training budget',
                              'missing-concept shared bucket for BKT/DKT; DAS3H retains item-only features there',
                              'model families have different input representations and tuning budgets']}
    save(directory / 'comparison.json', summary)
    return summary

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', type=Path, default=HERE / 'artifacts/seed42')
    print(json.dumps(compare(parser.parse_args().directory), indent=2))
