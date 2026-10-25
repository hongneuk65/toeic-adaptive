"""Run actual upstream models; no production database or model writes."""
from __future__ import annotations
import argparse
import importlib.metadata
import json
import platform
import time
from pathlib import Path
from common import HERE, ROOT, load_cohort, learner_splits, metrics, save, sha
import numpy as np

def run(args):
    started = time.perf_counter()
    out = args.output
    out.mkdir(parents=True, exist_ok=True)
    report_path = out / f'{args.model}-report.json'
    if report_path.exists():
        raise FileExistsError(f'Report already exists; use a new output directory: {report_path}')
    df, tags, hashes = load_cohort()
    splits = learner_splits(df, args.seed)
    frames = {k: df[df.user_id.isin(users)].copy() for k, users in splits.items()}
    counts = {k: {'learners': len(splits[k]), 'events': len(v)} for k, v in frames.items()}
    report = {'status': 'running', 'model': args.model, 'seed': args.seed,
              'sourceHashes': hashes, 'counts': counts,
              'protocol': 'learner-disjoint 70/15/15; submit-time targets; no same-timestamp outcome in predictions',
              'multiConceptFusion': 'arithmetic mean per question; one metric row per source question response',
              'untaggedPolicy': 'shared __UNTAGGED__ missing-label token; never interpreted as a skill',
              'untaggedEvents': int(df.question_id.map(lambda q: tags[q] == ['__UNTAGGED__']).sum()),
              'mappingStatus': 'research_candidate_not_final',
              'environment': {'python': platform.python_version(), 'numpy': np.__version__},
              'implementationHashes': {p.name: sha(p) for p in HERE.glob('*.py')},
              'config': vars(args) | {'output': str(out)}, 'metrics': {}}
    # CLI paths are serializable but no learner rows or split identities are public.
    save(out / f'{args.model}-progress.json', report)
    print(f'{args.model}: {counts}', flush=True)
    if args.model == 'bkt':
        from bkt import fit_bkt, predict_bkt
        report['environment']['pyBKT'] = importlib.metadata.version('pyBKT')
        params, diagnostics = fit_bkt(frames['train'], tags, args.seed, args.bkt_restarts, args.bkt_iterations)
        save(out / 'bkt-parameters.json', params)
        report['fitDiagnostics'] = diagnostics
        report['trainingCaveat'] = ('pyBKT EM uses sequential concept observations, including deterministic '
            'question order within simultaneous training timestamps. Online evaluation freezes the whole timestamp. '
            'This is an adaptation, not an exact joint-emission batch BKT likelihood.')
        val = predict_bkt(frames['val'], tags, params)
        report['metrics']['validation'] = metrics(frames['val'].correct, val)
        save(out / 'bkt-progress.json', report)
        test = predict_bkt(frames['test'], tags, params)
    else:
        from dkt import train_dkt
        report['environment']['pykt-toolkit'] = importlib.metadata.version('pykt-toolkit')
        val, test, details = train_dkt(frames, tags, args, out)
        report.update(details)
        report['metrics']['validation'] = metrics(frames['val'].correct, val)
    report['metrics']['test'] = metrics(frames['test'].correct, test)
    report['seconds'] = time.perf_counter() - started
    report['status'] = 'complete'
    save(report_path, report)
    save(out / f'{args.model}-progress.json', report)
    print(json.dumps({'model': args.model, 'metrics': report['metrics'], 'seconds': report['seconds']}, indent=2), flush=True)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', choices=['bkt', 'dkt'], required=True)
    parser.add_argument('--output', type=Path, default=HERE / 'artifacts/seed42')
    parser.add_argument('--seed', type=int, default=42)
    parser.add_argument('--bkt-restarts', type=int, default=2)
    parser.add_argument('--bkt-iterations', type=int, default=40)
    parser.add_argument('--epochs', type=int, default=15)
    parser.add_argument('--patience', type=int, default=4)
    parser.add_argument('--hidden', type=int, default=64)
    parser.add_argument('--batch-size', type=int, default=32)
    parser.add_argument('--window', type=int, default=192)
    parser.add_argument('--context', type=int, default=64)
    parser.add_argument('--threads', type=int, default=2)
    args = parser.parse_args()
    for key in ['bkt_restarts','bkt_iterations','epochs','patience','hidden','batch_size','window','threads']:
        if getattr(args, key) <= 0:
            parser.error(f'{key} must be positive')
    if args.context < 0:
        parser.error('context must not be negative')
    try:
        run(args)
    except BaseException as error:
        progress = args.output / f'{args.model}-progress.json'
        completed = args.output / f'{args.model}-report.json'
        if progress.exists() and not completed.exists():
            state = json.loads(progress.read_text(encoding='utf-8'))
            state['status'] = 'interrupted' if isinstance(error, KeyboardInterrupt) else 'failed'
            state['error'] = f'{type(error).__name__}: {error}'
            save(progress, state)
        raise
