"""Reproducible, bundle-causal pilot on local EdNet KT4. No production writes."""
from __future__ import annotations

import argparse
import copy
import csv
import hashlib
import io
import json
import math
import platform
import random
import sys
import time
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import scipy
from scipy.sparse import coo_matrix
import sklearn
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score
import torch
from torch import nn
from torch.utils.data import DataLoader

DAY = 86_400_000
WINDOWS = (DAY / 24, DAY, 7 * DAY, 30 * DAY, float('inf'))


def save_json(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')


def parse_user(text, metadata, stats):
    """Commit only the last response per question at the matching bundle submit.

    All questions in a bundle are predicted at enter, before its responses.
    A second enter abandons any unfinished bundle; never invent a label.
    """
    rows = list(csv.DictReader(io.StringIO(text)))
    ordered = sorted(enumerate(rows), key=lambda pair: (int(pair[1]['timestamp']), pair[0]))
    stats['out_of_order_users'] += int(any(i != original for i, (original, _) in enumerate(ordered)))
    active = None
    answers = {}
    bundles = []
    for _, row in ordered:
        action, item, timestamp = row['action_type'], row['item_id'], int(row['timestamp'])
        if action == 'enter' and item.startswith('b'):
            if active is not None:
                stats['abandoned_enters'] += 1
            active = (item, timestamp)
            answers = {}
        elif action == 'respond':
            if active is None or item not in metadata or metadata[item]['bundle_id'] != active[0]:
                stats['responses_without_matching_enter'] += 1
                continue
            answer = row['user_answer'].lower()
            if answer not in 'abcd' or len(answer) != 1:
                stats['invalid_answers'] += 1
                continue
            stats['answer_changes'] += int(item in answers)
            answers[item] = answer
        elif action == 'submit' and item.startswith('b'):
            if active is None or item != active[0]:
                stats['submits_without_matching_enter'] += 1
                continue
            events = [(q, int(a == metadata[q]['correct_answer'])) for q, a in sorted(answers.items())]
            if events:
                bundles.append({'start': active[1], 'end': timestamp, 'events': events})
            else:
                stats['empty_submits'] += 1
            active, answers = None, {}
    return bundles


def split_bundles(n):
    a, b = max(1, int(n * .7)), max(2, int(n * .85))
    return np.array([0 if t < a else 1 if t < b else 2 for t in range(n)], dtype=np.int8)


def history_features(bundles, metadata):
    """Strict pre-bundle snapshots; timestamps enter vs past submit, in ms."""
    history = defaultdict(list)
    output = []
    for bundle in bundles:
        current = []
        for q, y in bundle['events']:
            per_skill = []
            for skill in metadata[q]['skills']:
                values = []
                past = history[skill]
                for window in WINDOWS:
                    selected = [v for t, v in past if 0 <= bundle['start'] - t < window]
                    values.extend((math.log1p(sum(selected)), math.log1p(len(selected))))
                per_skill.append(values)
            current.append(per_skill)
        output.append(current)
        for q, y in bundle['events']:
            for skill in metadata[q]['skills']:
                history[skill].append((bundle['end'], y))
    return output


def prepare(args, out):
    cache = out / 'prepared.pt'
    config = {'zip': str(Path(args.data).resolve()), 'questions': str(Path(args.questions).resolve()),
              'users': args.users, 'max_bundles': args.max_bundles, 'min_bundles': args.min_bundles,
              'sample_seed': args.sample_seed, 'protocol_version': 1}
    if cache.exists():
        old = json.loads((out / 'manifest.json').read_text(encoding='utf-8'))
        if old['config'] != config:
            raise ValueError('Output contains a different experiment; choose a fresh --output.')
        print('Loading prepared data', flush=True)
        return torch.load(cache, weights_only=False), old
    metadata = {}
    with open(args.questions, encoding='utf-8-sig', newline='') as stream:
        for row in csv.DictReader(stream):
            skills = sorted(set(int(s) for s in row['tags'].split(';') if s and s != '-1'))
            row['skills'] = skills or [-1]  # explicit missing-tag category, not fabricated skill
            metadata[row['question_id']] = row
    users, features, selected, stats = [], [], [], Counter()
    started = time.perf_counter()
    with zipfile.ZipFile(args.data) as archive:
        names = sorted(n for n in archive.namelist() if n.endswith('.csv') and '/u' in n)
        random.Random(args.sample_seed).shuffle(names)
        for name in names:
            stats['scanned_users'] += 1
            text = archive.read(name).decode('utf-8-sig')
            bundles = parse_user(text, metadata, stats)
            if len(bundles) < args.min_bundles:
                stats['users_below_min_bundles'] += 1
                continue
            stats['truncated_users'] += int(len(bundles) > args.max_bundles)
            bundles = bundles[:args.max_bundles]
            users.append(bundles)
            features.append(history_features(bundles, metadata))
            selected.append(name)
            if len(users) % 100 == 0:
                print(f'Prepared {len(users)}/{args.users} learners ({time.perf_counter()-started:.1f}s)', flush=True)
            if len(users) >= args.users:
                break
    if len(users) < args.users:
        raise ValueError('Not enough eligible users')
    # Vocabulary is learned from training prefixes only. 0 is OOV/padding.
    train_q, train_s = set(), set()
    for bundles in users:
        for bundle, split in zip(bundles, split_bundles(len(bundles))):
            if split == 0:
                for q, _ in bundle['events']:
                    train_q.add(q)
                    train_s.update(metadata[q]['skills'])
    qmap = {q: i + 1 for i, q in enumerate(sorted(train_q))}
    smap = {s: i + 1 for i, s in enumerate(sorted(train_s))}
    max_k = max(len(row['skills']) for row in metadata.values())
    records, encoded = [], []
    idx = 0
    for uid, (bundles, user_features) in enumerate(zip(users, features)):
        sequence = []
        prev_end = None
        for bundle, fs, split in zip(bundles, user_features, split_bundles(len(bundles))):
            ids = []
            gap = math.log1p(max(0, bundle['start'] - prev_end) / 1000) if prev_end is not None else 0.
            for (q, y), phi in zip(bundle['events'], fs):
                raw_skills = metadata[q]['skills']
                records.append({'u': uid, 'q': qmap.get(q, 0), 's': [smap.get(s, 0) for s in raw_skills],
                                'phi': phi, 'y': y, 'split': int(split), 'gap': gap,
                                'part': int(metadata[q]['part']), 'q_oov': q not in qmap})
                ids.append(idx)
                idx += 1
            sequence.append(ids)
            prev_end = bundle['end']
        encoded.append(sequence)
    data = {'records': records, 'users': encoded, 'nq': len(qmap) + 1, 'ns': len(smap) + 1,
            'max_k': max_k, 'selected_users': selected, 'question_vocabulary': qmap, 'skill_vocabulary': smap}
    counts = Counter(r['split'] for r in records)
    manifest = {'config': config, 'source': 'https://github.com/riiid/ednet',
                'archive_size': Path(args.data).stat().st_size,
                'questions_sha256': hashlib.sha256(Path(args.questions).read_bytes()).hexdigest(),
                'selected_files_sha256': hashlib.sha256('\n'.join(selected).encode()).hexdigest(),
                'users': len(users), 'bundles': sum(map(len, encoded)), 'interactions': len(records),
                'splits': {name: counts[i] for i, name in enumerate(('train', 'validation', 'test'))},
                'train_questions': len(qmap), 'train_skills': len(smap), 'max_tags_per_question': max_k,
                'parse_audit': dict(stats), 'preparation_seconds': time.perf_counter() - started,
                'protocol': 'Within-user 70/15/15 chronological whole bundles; feedback after submit; '
                            'warm-start rolling evaluation; prefixes capped, not full EdNet; no global date split.'}
    save_json(out / 'manifest.json', manifest)
    save_json(out / 'selected-users.json', selected)
    torch.save(data, cache)
    return data, manifest


def sparse_design(data):
    rows, cols, vals = [], [], []
    nq, ns, nu = data['nq'], data['ns'], len(data['users'])
    for i, record in enumerate(data['records']):
        rr = [(record['u'], 1.)]
        if record['q']:
            rr.append((nu + record['q'], 1.))
        for s, phi in zip(record['s'], record['phi']):
            if s:
                rr.append((nu + nq + s, 1.))
                rr.extend((nu + nq + ns + s * 10 + j, v) for j, v in enumerate(phi) if v)
        for col, value in rr:
            rows.append(i)
            cols.append(col)
            vals.append(value)
    return coo_matrix((np.asarray(vals, dtype=np.float32), (rows, cols)),
                      shape=(len(data['records']), nu + nq + ns + ns * 10), dtype=np.float32).tocsr()


def metrics(y, p):
    p = np.clip(np.asarray(p, dtype=np.float64), 1e-7, 1 - 1e-7)
    bins = np.minimum((p * 10).astype(int), 9)
    ece = sum(np.mean(bins == b) * abs(np.mean(y[bins == b]) - np.mean(p[bins == b]))
              for b in range(10) if np.any(bins == b))
    return {'auc': float(roc_auc_score(y, p)), 'log_loss': float(log_loss(y, p, labels=[0, 1])),
            'brier': float(brier_score_loss(y, p)), 'accuracy_at_0.5': float(accuracy_score(y, p >= .5)),
            'ece_10_equal_width': float(ece), 'n': len(y)}


def fit_das3h(data, out):
    x = sparse_design(data)
    labels = np.array([r['y'] for r in data['records']], dtype=np.float32)
    splits = np.array([r['split'] for r in data['records']])
    train, valid, test = splits == 0, splits == 1, splits == 2
    best, best_loss, trials = None, float('inf'), []
    started = time.perf_counter()
    for c in (.01, .1, 1., 10.):
        model = LogisticRegression(C=c, solver='liblinear', max_iter=300, random_state=0)
        model.fit(x[train], labels[train])
        val = metrics(labels[valid], model.predict_proba(x[valid])[:, 1])
        trials.append({'C': c, 'validation': val, 'iterations': model.n_iter_.tolist()})
        print('DAS3H', c, val, flush=True)
        if val['log_loss'] < best_loss:
            best, best_loss = model, val['log_loss']
    logits = best.decision_function(x).astype(np.float32)
    result = {'name': 'DAS3H_d0_fitted', 'best_C': best.C, 'trials': trials,
              'validation': metrics(labels[valid], best.predict_proba(x[valid])[:, 1]),
              'test': metrics(labels[test], best.predict_proba(x[test])[:, 1]),
              'seconds': time.perf_counter() - started,
              'definition': 'L2 logistic: user + item + sum(skill bias + skill-specific log wins/attempts '
                            'in cumulative 1h/1d/7d/30d/all windows); train-prefix fit only; not repo heuristic.'}
    np.savez_compressed(out / 'das3h-weights.npz', coef=best.coef_, intercept=best.intercept_, logits=logits)
    save_json(out / 'das3h.json', result)
    return result, logits, labels, splits


def collator(data, logits, train_only=False):
    records, all_users, max_k = data['records'], data['users'], data['max_k']
    # Materialize once, rather than allocating tiny tensors for every event
    # on every epoch. This changes data loading only, not model inputs.
    if '_tensor_cache' not in data:
        cache = []
        for uid, seq in enumerate(all_users):
            t, q = len(seq), max(map(len, seq))
            arrays = {'q': np.zeros((t, q), dtype=np.int64),
                      's': np.zeros((t, q, max_k), dtype=np.int64),
                      'smask': np.zeros((t, q, max_k), dtype=np.float32),
                      'y': np.zeros((t, q), dtype=np.float32),
                      'mask': np.zeros((t, q), dtype=bool),
                      'split': np.full((t, q), -1, dtype=np.int64),
                      'gap': np.zeros((t, 1), dtype=np.float32),
                      'base': np.zeros((t, q), dtype=np.float32),
                      'id': np.full((t, q), -1, dtype=np.int64)}
            for ti, ids in enumerate(seq):
                arrays['gap'][ti, 0] = records[ids[0]]['gap'] / 10
                for qi, idx in enumerate(ids):
                    r = records[idx]
                    arrays['q'][ti, qi] = r['q']
                    arrays['s'][ti, qi, :len(r['s'])] = r['s']
                    arrays['smask'][ti, qi, :len(r['s'])] = 1
                    for key in ('y', 'split'):
                        arrays[key][ti, qi] = r[key]
                    arrays['mask'][ti, qi] = True
                    arrays['base'][ti, qi] = logits[idx]
                    arrays['id'][ti, qi] = idx
            cache.append({key: torch.from_numpy(value) for key, value in arrays.items()})
        data['_tensor_cache'] = cache
        print('Neural tensor cache ready', flush=True)
    def collate(user_ids):
        sequences = []
        for uid in user_ids:
            sequence = data['_tensor_cache'][uid]
            if train_only:
                n = int((sequence['split'][:, 0] == 0).sum())
                sequence = {key: value[:n] for key, value in sequence.items()}
            sequences.append(sequence)
        b = len(user_ids)
        t = max(seq['q'].shape[0] for seq in sequences)
        q = max(seq['q'].shape[1] for seq in sequences)
        batch = {'q': torch.zeros(b, t, q, dtype=torch.long),
                 's': torch.zeros(b, t, q, max_k, dtype=torch.long),
                 'smask': torch.zeros(b, t, q, max_k),
                 'y': torch.zeros(b, t, q), 'mask': torch.zeros(b, t, q, dtype=torch.bool),
                 'split': torch.full((b, t, q), -1, dtype=torch.long),
                 'gap': torch.zeros(b, t, 1), 'base': torch.zeros(b, t, q),
                 'id': torch.full((b, t, q), -1, dtype=torch.long),
                 'u': torch.tensor(user_ids, dtype=torch.long)}
        for bi, seq in enumerate(sequences):
            nt, nq = seq['q'].shape
            for key, value in seq.items():
                if key == 'gap':
                    batch[key][bi, :nt] = value
                else:
                    batch[key][bi, :nt, :nq] = value
        return batch
    return collate


class SequenceKT(nn.Module):
    """Same GRU architecture for pure vs frozen-DAS3H residual hybrid."""
    def __init__(self, nq, ns, nu, hybrid=False, embedding=16, hidden=32):
        super().__init__()
        self.hybrid = hybrid
        self.item = nn.Embedding(nq, embedding, padding_idx=0)
        self.skill = nn.Embedding(ns, embedding, padding_idx=0)
        self.interaction_item = nn.Embedding(2 * nq, embedding, padding_idx=0)
        self.interaction_skill = nn.Embedding(2 * ns, embedding, padding_idx=0)
        self.user = nn.Embedding(nu, 8)
        self.gru = nn.GRU(2 * embedding + 1, hidden, batch_first=True)
        self.head = nn.Sequential(nn.Linear(hidden + 2 * embedding + 8 + 1, 64), nn.ReLU(),
                                  nn.Dropout(.1), nn.Linear(64, 1))
        if hybrid:
            nn.init.zeros_(self.head[-1].weight)
            nn.init.zeros_(self.head[-1].bias)

    def forward(self, batch):
        q, s, y, mask, smask = [batch[k] for k in ('q', 's', 'y', 'mask', 'smask')]
        def pool_skill(embedding):
            return (embedding * smask.unsqueeze(-1)).sum(-2) / smask.sum(-1, keepdim=True).clamp_min(1)
        target = torch.cat((self.item(q), pool_skill(self.skill(s))), dim=-1)
        qi = torch.where(q > 0, 2 * q + y.long(), 0)
        si = torch.where(s > 0, 2 * s + y.long().unsqueeze(-1), 0)
        interaction = torch.cat((self.interaction_item(qi), pool_skill(self.interaction_skill(si))), dim=-1)
        bundle = (interaction * mask.unsqueeze(-1)).sum(-2) / mask.sum(-1, keepdim=True).clamp_min(1)
        current, _ = self.gru(torch.cat((bundle, batch['gap']), dim=-1))
        # Output at t uses state after t-1, never current y or other y in same bundle.
        previous = torch.cat((torch.zeros_like(current[:, :1]), current[:, :-1]), dim=1)
        size = (*q.shape, -1)
        state = previous.unsqueeze(-2).expand(size)
        user = self.user(batch['u'])[:, None, None, :].expand(size)
        gap = batch['gap'].unsqueeze(-2).expand(size)
        result = self.head(torch.cat((state, target, user, gap), dim=-1)).squeeze(-1)
        return result + batch['base'] if self.hybrid else result


def evaluate(model, loader, split, size):
    model.eval()
    output = np.full(size, np.nan, dtype=np.float32)
    with torch.no_grad():
        for batch in loader:
            pred = torch.sigmoid(model(batch))
            mask = batch['mask'] & (batch['split'] == split)
            output[batch['id'][mask].numpy()] = pred[mask].numpy()
    return output


def fit_sequence(data, logits, labels, splits, args, out, seed, hybrid):
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    model = SequenceKT(data['nq'], data['ns'], len(data['users']), hybrid)
    loader = DataLoader(list(range(len(data['users']))), batch_size=args.batch_size, shuffle=True,
                        generator=torch.Generator().manual_seed(seed), collate_fn=collator(data, logits, True))
    evaluation = DataLoader(list(range(len(data['users']))), batch_size=args.batch_size,
                            collate_fn=collator(data, logits))
    opt = torch.optim.AdamW(model.parameters(), lr=.002, weight_decay=.0001)
    name = 'DAS3H_GRU_residual' if hybrid else 'GRU'
    best_state, best_loss, best_epoch, stale = None, float('inf'), 0, 0
    history, started = [], time.perf_counter()
    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss, total_n = 0., 0
        for batch in loader:
            opt.zero_grad(set_to_none=True)
            pred = model(batch)
            mask = batch['mask']
            loss = nn.functional.binary_cross_entropy_with_logits(pred[mask], batch['y'][mask])
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 5.)
            opt.step()
            total_loss += float(loss.detach()) * int(mask.sum())
            total_n += int(mask.sum())
        val_pred = evaluate(model, evaluation, 1, len(labels))
        val = metrics(labels[splits == 1], val_pred[splits == 1])
        history.append({'epoch': epoch, 'train_bce': total_loss / total_n, 'validation': val})
        print(f'{name} seed={seed} epoch={epoch} train={total_loss/total_n:.5f} '
              f'val_loss={val["log_loss"]:.5f} val_auc={val["auc"]:.5f} '
              f'elapsed={time.perf_counter()-started:.1f}s', flush=True)
        if val['log_loss'] < best_loss - 1e-5:
            best_loss, best_epoch, stale = val['log_loss'], epoch, 0
            best_state = copy.deepcopy(model.state_dict())
        else:
            stale += 1
        if stale >= args.patience:
            break
    model.load_state_dict(best_state)
    # Do not inspect test metrics until epoch selection is finished.
    test_pred = evaluate(model, evaluation, 2, len(labels))
    val_pred = evaluate(model, evaluation, 1, len(labels))
    result = {'name': name, 'seed': seed, 'best_epoch': best_epoch, 'history': history,
              'validation': metrics(labels[splits == 1], val_pred[splits == 1]),
              'test': metrics(labels[splits == 2], test_pred[splits == 2]),
              'seconds': time.perf_counter() - started, 'parameters': sum(p.numel() for p in model.parameters())}
    stem = f'{name}-seed{seed}'
    torch.save({'state_dict': model.state_dict(), 'hybrid': hybrid, 'nq': data['nq'], 'ns': data['ns'],
                'nu': len(data['users']), 'best_epoch': best_epoch}, out / f'{stem}.pt')
    np.savez_compressed(out / f'{stem}-predictions.npz', test=test_pred, validation=val_pred)
    save_json(out / f'{stem}.json', result)
    return result, test_pred


def paired_bootstrap(labels, predictions, user_ids, repeats=300):
    """Paired bootstrap resampling learners, using mean predictions across seeds."""
    rng = np.random.default_rng(20261017)
    users = np.unique(user_ids)
    by_user = [np.flatnonzero(user_ids == uid) for uid in users]
    comparisons = {}
    for baseline in ('DAS3H_d0_fitted', 'GRU'):
        deltas = []
        for _ in range(repeats):
            indices = np.concatenate([by_user[i] for i in rng.integers(0, len(users), len(users))])
            yt = labels[indices]
            a, b = predictions['DAS3H_GRU_residual'][indices], predictions[baseline][indices]
            deltas.append((roc_auc_score(yt, a) - roc_auc_score(yt, b),
                           log_loss(yt, a) - log_loss(yt, b)))
        values = np.asarray(deltas)
        comparisons[baseline] = {'delta_auc_ci95': np.quantile(values[:, 0], [.025, .975]).tolist(),
                                 'delta_log_loss_ci95': np.quantile(values[:, 1], [.025, .975]).tolist(),
                                 'definition': 'Hybrid minus baseline; seed-mean ensemble predictions; '
                                               'learner bootstrap, not training-seed uncertainty.'}
    return comparisons


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--data', required=True)
    parser.add_argument('--questions', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--users', type=int, default=2000)
    parser.add_argument('--min-bundles', type=int, default=20)
    parser.add_argument('--max-bundles', type=int, default=200)
    parser.add_argument('--sample-seed', type=int, default=20261017)
    parser.add_argument('--seeds', type=int, nargs='+', default=[11, 22, 33])
    parser.add_argument('--epochs', type=int, default=12)
    parser.add_argument('--patience', type=int, default=3)
    parser.add_argument('--batch-size', type=int, default=32)
    parser.add_argument('--threads', type=int, default=4)
    args = parser.parse_args()
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(args.threads)
    torch.set_num_interop_threads(1)
    torch.use_deterministic_algorithms(True)
    save_json(out / 'environment.json', {'python': sys.version, 'platform': platform.platform(),
              'numpy': np.__version__, 'scipy': scipy.__version__, 'sklearn': sklearn.__version__,
              'torch': torch.__version__, 'cuda': torch.cuda.is_available(), 'args': vars(args),
              'script_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()})
    data, manifest = prepare(args, out)
    print('Manifest', manifest, flush=True)
    das, logits, labels, splits = fit_das3h(data, out)
    results = [das]
    test = splits == 2
    predictions = {'DAS3H_d0_fitted': 1 / (1 + np.exp(-logits[test]))}
    for hybrid in (False, True):
        seed_preds = []
        for seed in args.seeds:
            result, pred = fit_sequence(data, logits, labels, splits, args, out, seed, hybrid)
            results.append(result)
            seed_preds.append(pred[test])
        predictions[result['name']] = np.mean(seed_preds, axis=0)
    np.savez_compressed(out / 'test-predictions.npz', y=labels[test],
                        users=np.array([r['u'] for r in data['records']])[test], **predictions)
    summary = {}
    for name in predictions:
        runs = [r['test'] for r in results if r['name'] == name]
        summary[name] = {metric: {'mean': float(np.mean([r[metric] for r in runs])),
                                 'std': float(np.std([r[metric] for r in runs]))}
                         for metric in ('auc', 'log_loss', 'brier', 'accuracy_at_0.5', 'ece_10_equal_width')}
    bootstrap = paired_bootstrap(labels[test], predictions, np.array([r['u'] for r in data['records']])[test])
    result = {'manifest': manifest, 'summary_single_runs': summary, 'runs': results,
              'seed_mean_ensemble': {name: metrics(labels[test], p) for name, p in predictions.items()},
              'paired_bootstrap_seed_mean_ensemble': bootstrap,
              'limitations': ['Pilot subset, not full EdNet or official benchmark.',
                              'Warm-start within-user split, not unseen learners or future global dates.',
                              'DAS3H is fitted d=0 formulation, not the production heuristic.',
                              'Hybrid is frozen-DAS3H logit plus trained GRU residual, not published RKTM reproduction.',
                              'Tags are EdNet tags, not validated mappings to application micro-skills.',
                              'No TOEIC score gain or scheduling benefit is measured.',
                              'Logistic C grid vs fixed neural configuration is not equal-budget exhaustive tuning.']}
    save_json(out / 'results.json', result)
    print('FINAL', json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
