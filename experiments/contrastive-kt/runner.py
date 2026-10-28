"""Pinned DCL4KT backbone, prefix-causal adapter; no production writes.

Training and final test evaluation are separate commands. All validation-selected
checkpoints must exist before evaluation may begin. Smoke runs never rank models.
"""
import argparse
import copy
import functools
import hashlib
import json
import random
import sys
import time
from pathlib import Path
from types import SimpleNamespace

HERE = Path(__file__).resolve().parent
bootstrap = argparse.ArgumentParser(add_help=False)
bootstrap.add_argument('--data-root', type=Path)
bootstrap_args, _ = bootstrap.parse_known_args()
if bootstrap_args.data_root:
    sys.path.insert(0, str(bootstrap_args.data_root / 'experiments/kt-benchmark/.runtime'))
sys.path.insert(0, str(HERE.parent / 'kt-benchmark'))
from common import load_cohort, learner_splits, metrics, save, sha
import common
import numpy as np
import torch
from torch.utils.data import DataLoader
from data import PrefixDataset, vocabulary, difficulty, collate, evaluate
from augmentation import augment, replacement_pool, PAPER_PROBABILITIES
from upstream import load_model, COMMIT, MODEL_SHA256, REPOSITORY

def early_metrics(frame, prediction):
    prior = frame.groupby('user_id', sort=False).cumcount()
    prior = prior.groupby([frame.user_id, frame.timestamp], sort=False).transform('min')
    return {name: metrics(frame.correct.to_numpy()[mask], prediction[mask])
            for name, mask in [('first_10', (prior < 10).to_numpy()),
                ('10_to_49', ((prior >= 10) & (prior < 50)).to_numpy()),
                ('50_plus', (prior >= 50).to_numpy())] if mask.any()}

def recipe(smoke=False):
    return {'protocol': 'dcl4kt-prefix-v1', 'splitSeed': 42,
            'seeds': [42] if smoke else [42, 43, 44],
            'learningRates': [.001] if smoke else [.001, .0003],
            'variants': ['base', 'augment'], 'epochs': 1 if smoke else 100,
            'patience': 10, 'hidden': 32 if smoke else 512,
            'heads': 4 if smoke else 16, 'layers': 1 if smoke else 4,
            'length': 16 if smoke else 100, 'batch': 4 if smoke else 512,
            'effectiveBatch': 8 if smoke else 512, 'dropout': .1,
            'contrastiveWeight': .1, 'smoke': smoke,
            'augmentation': PAPER_PROBABILITIES, 'cutoff': .03}

def model_config(plan, augmented):
    # Retain author's cutoff implementation; only enabled for augmentation arm.
    return SimpleNamespace(use_cutoff=augmented, use_span_cutoff=False, cutoff_prob=plan['cutoff'])

def create_model(cls, vocab, plan, augmented):
    device = torch.device(plan.get('device', 'cpu'))
    return cls(len(vocab['skills']), 2, len(vocab['items']), 101, 101, 101, 101,
               plan['hidden'], 1, plan['heads'], plan['layers'], plan['length'],
               device, True, model_config(plan, augmented), plan['dropout']).to(device)

def forward_training(model, batch, augmented, pool, rng):
    t, mask = batch['tokens'].to(model.device), batch['mask'].to(model.device)
    q, pid, r, qd, pd = t.unbind(-1)
    if augmented:
        a, am = augment(batch['sequences'], model.num_q-3, model.num_pid-3, pool, rng, pad_to=t.shape[1])
        b, bm = augment(batch['sequences'], model.num_q-3, model.num_pid-3, pool, rng, pad_to=t.shape[1])
    else:
        a, b, am, bm = t, t, mask, mask
    a, b, am, bm = a.to(model.device), b.to(model.device), am.to(model.device), bm.to(model.device)
    aq, ap, ar, ad, aid = a.unbind(-1)
    bq, bp, br, bd, bid = b.unbind(-1)
    pred, similarities, labels = model(q, r, pid, qd, pd, torch.where(r < 2, 1-r, 2),
        torch.where(qd <= 100, 100-qd, qd), torch.where(pd <= 100, 100-pd, pd), mask,
        aq, bq, ap, bp, ar, br, ad, bd, aid, bid, am, bm)
    p = pred[torch.arange(len(t), device=model.device), batch['last'].to(model.device), 0]
    weights = batch['weights'].to(model.device)
    bce = (torch.nn.functional.binary_cross_entropy(p, batch['labels'].to(model.device), reduction='none') * weights).sum()
    # Multiple prefix queries can belong to one learner. Do not treat them as
    # unrelated in-batch negatives. Preserve the paired positive/hard negative.
    users = batch['users']; n = len(users)
    same = torch.tensor([[i != j and users[i] == users[j] for j in range(n)] for i in range(n)], device=model.device)
    similarities = similarities.masked_fill(torch.cat([same, same], dim=1), -1e8)
    cl = torch.nn.functional.cross_entropy(similarities, labels, reduction='none')
    cl = (cl * weights).sum()
    return bce, cl

def fit_one(cls, datasets, frames, vocab, plan, variant, seed, lr, pool, out):
    torch.manual_seed(seed); np.random.seed(seed); random.seed(seed)
    rng = random.Random(seed)
    loader = DataLoader(datasets['train'], batch_size=plan['batch'], shuffle=True,
        generator=torch.Generator().manual_seed(seed), collate_fn=functools.partial(collate,
        num_skills=len(vocab['skills']), num_items=len(vocab['items']), max_length=plan['length']))
    validation = DataLoader(datasets['val'], batch_size=plan['batch'], collate_fn=loader.collate_fn)
    model = create_model(cls, vocab, plan, variant == 'augment')
    optimizer = torch.optim.Adam(model.parameters(), lr=lr)
    history, best, stale = [], None, 0
    target_weight = plan['effectiveBatch']
    for epoch in range(1, plan['epochs']+1):
        model.train(); optimizer.zero_grad(); accumulated = 0.; loss_sum = 0.; event_sum = 0.
        started = time.perf_counter()
        for index, batch in enumerate(loader):
            bce, cl = forward_training(model, batch, variant == 'augment', pool, rng)
            loss = (1-plan['contrastiveWeight'])*bce + plan['contrastiveWeight']*cl
            if not torch.isfinite(loss):
                raise ValueError('Nonfinite loss')
            loss.backward()
            weight = batch['weights'].sum().item(); accumulated += weight
            loss_sum += loss.item(); event_sum += weight
            if accumulated >= target_weight or index+1 == len(loader):
                for parameter in model.parameters():
                    if parameter.grad is not None:
                        parameter.grad.div_(accumulated)
                torch.nn.utils.clip_grad_norm_(model.parameters(), 5.)
                optimizer.step(); optimizer.zero_grad(); accumulated = 0.
        score = metrics(frames['val'].correct, evaluate(model, validation, frames['val']))
        record = {'epoch': epoch, 'validation': score, 'trainLoss': loss_sum/event_sum,
                  'seconds': time.perf_counter()-started}
        history.append(record)
        save(out / 'epochs.json', history)
        print(f'{variant} seed={seed} lr={lr} epoch={epoch}: val_loss={score["log_loss"]:.6f}', flush=True)
        if best is None or score['log_loss'] < best['validation']['log_loss']:
            best = record; stale = 0
            torch.save({'state': copy.deepcopy(model.state_dict()), 'vocab': vocab,
                        'plan': plan, 'variant': variant, 'epoch': epoch}, out / 'best.pt')
        else:
            stale += 1
        if stale >= plan['patience']:
            break
    return {'status': 'complete', 'variant': variant, 'seed': seed, 'lr': lr,
            'best': best, 'epochs': len(history), 'checkpointHash': sha(out / 'best.pt')}

def main(args):
    common.ROOT = args.data_root
    # Pin a bounded CPU budget; never install a GPU runtime or buy compute.
    torch.set_num_threads(args.threads)
    torch.use_deterministic_algorithms(True)
    cls = load_model(args.upstream)
    if args.device == 'cuda' and not torch.cuda.is_available():
        raise RuntimeError('CUDA unavailable; install a compatible runtime on a GPU host. No CPU fallback is hidden.')
    df, tags, hashes = load_cohort()
    splits = learner_splits(df, 42)
    if args.smoke:
        splits = {key: set(sorted(users)[:2]) for key, users in splits.items()}
    frames = {key: df[df.user_id.isin(users)].copy() for key, users in splits.items()}
    if args.smoke:
        # Retain complete submit boundaries and do not change the full-run plan.
        frames = {key: frame.groupby('user_id', sort=False).head(24).copy() for key, frame in frames.items()}
        for key, frame in frames.items():
            for uid, group in frame.groupby('user_id', sort=False):
                cutoff = group.timestamp.iloc[-1]
                all_rows = df[(df.user_id == uid) & (df.timestamp <= cutoff)]
                frames[key] = frames[key].drop(group.index)
                frames[key] = __import__('pandas').concat([frames[key], all_rows])
            frames[key] = frames[key].sort_values(['user_id', 'timestamp', 'question_id'])
    vocab = vocabulary(frames['train'], tags); diffs = difficulty(frames['train'], tags)
    plan = recipe(args.smoke)
    plan['device'] = args.device
    if args.phase == 'profile' and args.batch_size is None:
        plan['batch'] = 32  # bounded CPU profile, never a leaderboard run
    if args.batch_size is not None:
        if args.batch_size > plan['effectiveBatch']:
            raise ValueError('batch-size cannot exceed effective batch')
        plan['batch'] = args.batch_size
    source_hashes = {path.name: sha(path) for path in HERE.glob('*.py')}
    plan_hash = hashlib.sha256(json.dumps({'plan': plan, 'sources': source_hashes, 'data': hashes}, sort_keys=True).encode()).hexdigest()
    if args.phase in ('train', 'profile'):
        if args.output.exists():
            raise FileExistsError('Use a new output directory')
        args.output.mkdir(parents=True)
        report = {'status': 'training', 'plan': plan, 'planHash': plan_hash,
            'sourceHashes': hashes, 'implementationHashes': source_hashes,
            'upstream': {'repository': REPOSITORY, 'commit': COMMIT, 'modelSha256': MODEL_SHA256,
                'patches': ['CPU .device instead of get_device()', 'compare pooling uses mask_i', 'positive pooling uses mask_j'],
                'contrastiveCoupling': 'Released separate encoders; only shared positional embedding connects CL to prediction'},
            'adaptations': ['prefix-only masked query', 'train-only difficulty and vocabulary',
                'whole-submit history boundaries', 'multi-concept weighted training / mean fusion',
                'aligned tuple augmentation per sequence', 'same-learner off-diagonal contrastive negatives excluded'],
            'counts': {key: {'learners': frame.user_id.nunique(), 'events': len(frame)} for key, frame in frames.items()},
            'environment': {'torch': torch.__version__, 'numpy': np.__version__, 'device': args.device}, 'fits': []}
        save(args.output / 'report.json', report)
    else:
        report = json.loads((args.output / 'report.json').read_text())
        if report['planHash'] != plan_hash or report['status'] not in ('trained', 'smoke_trained'):
            raise ValueError('Changed plan/source/data or incomplete training; test is locked')
    datasets = {key: PrefixDataset(frame, tags, vocab, diffs, plan['length']) for key, frame in frames.items()
                if (key != 'test' or args.phase == 'evaluate') and (args.phase != 'profile' or key == 'train')}
    pool = replacement_pool(vocab, diffs, tags)
    if args.phase == 'profile':
        torch.manual_seed(42)
        loader = DataLoader(datasets['train'], batch_size=plan['batch'], shuffle=True,
            generator=torch.Generator().manual_seed(42), collate_fn=functools.partial(collate,
            num_skills=len(vocab['skills']), num_items=len(vocab['items']), max_length=plan['length']))
        model = create_model(cls, vocab, plan, True); model.train()
        samples = []
        for index, batch in enumerate(loader):
            if index == 3:
                break
            model.zero_grad(); start = time.perf_counter()
            bce, cl = forward_training(model, batch, True, pool, random.Random(42+index))
            (bce*.9+cl*.1).backward()
            samples.append(time.perf_counter()-start)
        report['status'] = 'profile_only'
        report['profile'] = {'stepSeconds': samples, 'trainPrefixQueries': len(datasets['train']),
            'batchesPerEpoch': len(loader), 'estimatedTrainEpochSeconds': float(np.median(samples))*len(loader),
            'caveat': 'Three CPU batches only; excludes validation, optimizer steps, caching effects and early stopping'}
        save(args.output / 'report.json', report); print(json.dumps(report['profile']), flush=True)
        return
    if args.phase == 'train':
        for variant in plan['variants']:
            for seed in plan['seeds']:
                for lr in plan['learningRates']:
                    name = f'{variant}-{seed}-{lr}'
                    out = args.output / name; out.mkdir()
                    try:
                        result = fit_one(cls, datasets, frames, vocab, plan, variant, seed, lr, pool, out)
                    except BaseException as error:
                        report['status'] = 'failed'; report['error'] = f'{type(error).__name__}: {error}'
                        save(args.output / 'report.json', report); raise
                    report['fits'].append(result | {'directory': name})
                    save(args.output / 'report.json', report)
        report['status'] = 'smoke_trained' if args.smoke else 'trained'
        save(args.output / 'report.json', report)
        return
    if len(report['fits']) != len(plan['variants'])*len(plan['seeds'])*len(plan['learningRates']):
        raise ValueError('Not all preregistered fits completed')
    loader = DataLoader(datasets['test'], batch_size=plan['batch'], collate_fn=functools.partial(collate,
        num_skills=len(vocab['skills']), num_items=len(vocab['items']), max_length=plan['length']))
    # Lock all choices by validation before evaluating any test checkpoint.
    selected = [min([fit for fit in report['fits'] if fit['variant'] == variant and fit['seed'] == seed],
        key=lambda fit: (fit['best']['validation']['log_loss'], fit['lr'])) for variant in plan['variants'] for seed in plan['seeds']]
    report['selected'] = selected; report['status'] = 'evaluating'
    save(args.output / 'report.json', report)
    baseline = None
    if not args.smoke:
        from compare import predict_das3h
        reference_dir = args.data_root / 'experiments/das3h-production/artifacts/own-20261019'
        artifact = json.loads((reference_dir / 'model.json').read_text())
        reference = json.loads((reference_dir / 'training-report.json').read_text())
        for record in (artifact, reference):
            for key in ('cohort', 'projection', 'catalog'):
                if record['sourceHashes'][key] != hashes[key]:
                    raise ValueError('DAS3H source mismatch')
        if reference['seed'] != 42 or reference['counts'] != report['counts']:
            raise ValueError('DAS3H split/count mismatch')
        baseline = predict_das3h(frames['test'], artifact)
        score = metrics(frames['test'].correct, baseline)
        for key in ('auc', 'log_loss', 'brier', 'accuracy'):
            if abs(score[key] - reference['metrics']['own_das3h'][key]) > 1e-9:
                raise ValueError('DAS3H reference reproduction mismatch')
        report['das3h'] = {'test': score, 'early': early_metrics(frames['test'], baseline)}
    results = []
    for fit in selected:
        checkpoint = args.output / fit['directory'] / 'best.pt'
        if sha(checkpoint) != fit['checkpointHash']:
            raise ValueError('Checkpoint changed')
        saved = torch.load(checkpoint, map_location='cpu', weights_only=True)
        model = create_model(cls, vocab, plan, fit['variant'] == 'augment')
        model.load_state_dict(saved['state'])
        prediction = evaluate(model, loader, frames['test'])
        result = {'variant': fit['variant'], 'seed': fit['seed'], 'test': metrics(frames['test'].correct, prediction)}
        if baseline is not None:
            from compare import paired_loss_interval
            result['early'] = early_metrics(frames['test'], prediction)
            result['pairedVsDas3h'] = paired_loss_interval(frames['test'], prediction, baseline)
        results.append(result); print(json.dumps(result), flush=True)
        report['results'] = results; save(args.output / 'report.json', report)
    report['status'] = 'smoke_complete' if args.smoke else 'complete'
    save(args.output / 'report.json', report)

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-root', type=Path, required=True)
    parser.add_argument('--upstream', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--phase', choices=['train', 'evaluate', 'profile'], required=True)
    parser.add_argument('--threads', type=int, default=2)
    parser.add_argument('--batch-size', type=int)
    parser.add_argument('--device', choices=['cpu', 'cuda'], default='cpu')
    parser.add_argument('--smoke', action='store_true')
    args = parser.parse_args()
    if args.threads < 1:
        parser.error('threads must be positive')
    if args.batch_size is not None and args.batch_size < 2:
        parser.error('batch-size must be at least 2 for contrastive negatives')
    sys.path.insert(0, str(args.data_root / 'experiments/kt-benchmark/.runtime'))
    main(args)
