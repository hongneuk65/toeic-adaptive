"""Fit an OWN-tag DAS3H d=0 artifact with a portable inference contract.

Uses the audited, completed-submission cohort from the mapping experiment.
Private learner rows/splits are never exported to the application artifact.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import sys
import time
import warnings
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from threadpoolctl import threadpool_limits

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'ednet_santa_mapping_clean'))
from src.das3h_comparison import encode_history
from src.das3h_test import split_users, metrics

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def save(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')

def run(args):
    started = time.perf_counter()
    mapping_root = ROOT / 'ednet_santa_mapping_clean'
    source = mapping_root / 'outputs/ednet_with_own_tags.json'
    taxonomy = mapping_root / 'outputs/own_taxonomy.json'
    catalog_path = mapping_root / 'data/raw/ednet/questions.csv'
    cache = mapping_root / 'data/interaction_cache/u3000_e0_s2026.csv.gz'
    manifest = json.loads(cache.with_suffix('.manifest.json').read_text())
    if manifest['signature']['catalog_sha256'] != sha(catalog_path):
        raise ValueError('Cached submission catalog differs from current metadata')
    projection = json.loads(source.read_text(encoding='utf-8'))
    catalog = pd.read_csv(catalog_path).set_index('question_id')
    skills = {r['question_id']: sorted(set(r['own_content_tag_ids'])) for r in projection}
    if set(skills) != set(catalog.index):
        raise ValueError('OWN catalog coverage mismatch')
    df = pd.read_csv(cache, dtype={'user_id': str})
    if len(df) != manifest['attempts'] or df.user_id.nunique() != manifest['learners']:
        raise ValueError('Cohort count mismatch')
    if not df[['user_id','timestamp']].equals(df.sort_values(['user_id','timestamp'], kind='stable')[['user_id','timestamp']]):
        raise ValueError('Cohort must be user/time sorted')
    splits = split_users(df, args.seed)
    masks = {k: df.user_id.isin(v).to_numpy() for k,v in splits.items()}
    y = df.correct.to_numpy()
    report = {'cohort': {'learners': int(df.user_id.nunique()), 'submissions': len(df),
                         'scope': 'audited 3000 learner cohort, all completed history; not all KT4'},
              'split': 'learner-disjoint 70/15/15; prior submission timestamps strictly before prediction',
              'seed': args.seed, 'windowsMs': [None,2592000000,604800000,86400000,3600000],
              'featureContract': 'sum skill bias and log1p(wins)/log1p(attempts), cumulative windows (now-window, now)',
              'sourceHashes': {'projection': sha(source), 'taxonomy': sha(taxonomy), 'catalog': sha(catalog_path),
                               'cohort': sha(cache), 'trainer': sha(__file__)},
              'counts': {k: {'learners': len(splits[k]), 'events': int(v.sum())} for k,v in masks.items()},
              'mappingStatus': 'research_candidate_not_final', 'trials': [], 'metrics': {}}
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    own_model = None
    for name, tags in [('item_only', {q: [] for q in skills}), ('own_das3h', skills)]:
        print(f'Encoding {name}: {len(df):,} events', flush=True)
        X = encode_history(df, tags, splits['train'])
        best = None
        for c in args.c_grid:
            model = LogisticRegression(C=c, solver='liblinear', max_iter=1000, tol=1e-5, random_state=args.seed)
            with threadpool_limits(limits=1), warnings.catch_warnings(record=True) as caught:
                warnings.simplefilter('always', ConvergenceWarning)
                model.fit(X[masks['train']], y[masks['train']])
            converged = not any(issubclass(w.category, ConvergenceWarning) for w in caught)
            loss = metrics(y[masks['val']], model.predict_proba(X[masks['val']])[:,1])['log_loss']
            report['trials'].append({'variant': name, 'C': c, 'validationLogLoss': loss, 'converged': converged})
            print(f'{name} C={c}: validation logloss={loss:.6f}, converged={converged}', flush=True)
            save(out/'training-report.json', report)
            if converged and (best is None or loss < best[0]):
                best = (loss, c, model)
        if best is None:
            raise RuntimeError('No converged model: '+name)
        model = best[2]
        probability = model.predict_proba(X[masks['test']])[:,1]
        report['metrics'][name] = {'C': best[1], 'validationLogLoss': best[0], **metrics(y[masks['test']], probability)}
        print(f'{name} held-out: {report["metrics"][name]}', flush=True)
        if name == 'own_das3h':
            own_model = model
            # Keep only aggregate counts and a small anonymous numeric parity fixture.
            indices = np.flatnonzero(masks['test'])[:64]
            fixture_rows = []
            nu, nq = len(splits['train']), len(skills)
            sorted_tags = sorted({s for ss in skills.values() for s in ss})
            ns = len(sorted_tags)
            for index in indices:
                row = X.getrow(index)
                feature_map = dict(zip(row.indices.tolist(), row.data.tolist()))
                q = df.iloc[index].question_id
                fixture_rows.append({'questionId': q, 'skillFeatures': {tag: {
                    'wins': [feature_map.get(nu+nq+ns+si*5+w, 0.) for w in range(5)],
                    'attempts': [feature_map.get(nu+nq+ns+ns*5+si*5+w, 0.) for w in range(5)]}
                    for si, tag in enumerate(sorted_tags) if tag in skills[q]},
                    'expectedProbability': float(model.predict_proba(row)[0,1])})
            save(out/'parity-fixture.json', fixture_rows)
        del X
    nu, nq = len(splits['train']), len(skills)
    tags = sorted({s for ss in skills.values() for s in ss})
    ns = len(tags)
    weights = own_model.coef_[0]
    artifact = {'schemaVersion': 1, 'featureContract': 'own-das3h-d0-cumulative-v1',
        'createdAt': datetime.now(timezone.utc).isoformat(), 'intercept': float(own_model.intercept_[0]),
        'windowsMs': report['windowsMs'], 'sourceHashes': report['sourceHashes'],
        'mappingStatus': report['mappingStatus'], 'metrics': report['metrics'], 'cohort': report['cohort'],
        'questions': {q: {'bias': float(weights[nu+i]), 'tags': skills[q],
                         'part': int(str(catalog.loc[q,'part']).replace('p','')), 
                         'correctAnswer': str(catalog.loc[q,'correct_answer']).upper()}
                      for i,q in enumerate(sorted(skills))},
        'skills': {tag: {'bias': float(weights[nu+nq+i]),
                        'wins': [float(weights[nu+nq+ns+i*5+w]) for w in range(5)],
                        'attempts': [float(weights[nu+nq+ns+ns*5+i*5+w]) for w in range(5)]}
                   for i,tag in enumerate(tags)}}
    artifact['version'] = 'own-das3h-' + hashlib.sha256(json.dumps(artifact, sort_keys=True).encode()).hexdigest()[:16]
    # Never select a model using test data. A fixed release gate may reject it.
    report['releaseGatePassed'] = report['metrics']['own_das3h']['log_loss'] <= report['metrics']['item_only']['log_loss']
    report['seconds'] = time.perf_counter()-started
    report['version'] = artifact['version']
    artifact['releaseGatePassed'] = report['releaseGatePassed']
    save(out/'model.json', artifact)
    save(out/'training-report.json', report)
    print(f'Finished {artifact["version"]}; release gate={report["releaseGatePassed"]}', flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=ROOT/'experiments/das3h-production/artifacts/own-20261019')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--c-grid', type=float, nargs='+', default=[.1,1.,10.])
    run(parser.parse_args())
