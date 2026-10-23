"""Upstream pyKT DKT with group-causal masks and question-level late fusion.

Load the released leaf module directly: importing pykt.models also imports many
unrelated model/tracking dependencies. The upstream source is never modified.
"""
from __future__ import annotations
import copy
import importlib.util
import random
from collections import defaultdict
from common import HERE, blocks, metrics, save, sha
import numpy as np
import torch
from torch.utils.data import DataLoader

def official_dkt():
    path = HERE / '.runtime/pykt/models/dkt.py'
    if not path.is_file():
        raise ImportError('Install pinned pykt-toolkit into .runtime first')
    spec = importlib.util.spec_from_file_location('benchmark_upstream_pykt_dkt', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.DKT

def make_windows(df, tags, concepts, window=192, context=64):
    """Complete timestamp groups, overlapping prior context, no duplicated targets.

    Each concept token points to the final token strictly before its submit.
    Context tokens carry no training loss. Each event's concept weights sum to 1.
    """
    result = []
    for _, user_df in df.groupby('user_id', sort=False):
        groups = []
        for group in blocks(user_df):
            tokens = []
            for row in group.itertuples():
                cs = tags[row.question_id]
                tokens.extend((concepts[c], int(row.correct), int(row.Index), 1 / len(cs)) for c in cs)
            groups.append(tokens)
        start = 0
        while start < len(groups):
            end, size = start, 0
            while end < len(groups) and (size < window or end == start):
                size += len(groups[end])
                end += 1
            history_start, history_size = start, 0
            while history_start > 0 and history_size < context:
                history_start -= 1
                history_size += len(groups[history_start])
            tokens, previous, selected = [], [], []
            for gi in range(history_start, end):
                prior = len(tokens) - 1
                for token in groups[gi]:
                    tokens.append(token)
                    previous.append(prior)
                    selected.append(gi >= start)
            result.append({'tokens': tokens, 'previous': previous, 'selected': selected})
            start = end
    return result

def collate(windows):
    n, length = len(windows), max(len(w['tokens']) for w in windows)
    q = torch.zeros(n, length, dtype=torch.long)
    r = torch.zeros_like(q)
    previous = torch.full_like(q, -1)
    ids = torch.full_like(q, -1)
    weights = torch.zeros(n, length)
    for i, w in enumerate(windows):
        for j, (concept, correct, event_id, weight) in enumerate(w['tokens']):
            q[i,j], r[i,j], ids[i,j] = concept, correct, event_id
            previous[i,j] = w['previous'][j]
            weights[i,j] = weight if w['selected'][j] else 0
    return q, r, previous, ids, weights

def causal_predictions(model, batch):
    q, r, previous, _, _ = batch
    # Official DKT is a unidirectional LSTM. Gather outputs only at prior submit.
    output = model(q, r)
    bi = torch.arange(q.shape[0])[:, None]
    predictions = output[bi, previous.clamp(min=0), q]
    cold = torch.sigmoid(model.out_layer.bias)[q]
    return torch.where(previous >= 0, predictions, cold)

def evaluate(model, loader, df):
    model.eval()
    totals, weights = defaultdict(float), defaultdict(float)
    with torch.no_grad():
        for batch in loader:
            probabilities = causal_predictions(model, batch).numpy()
            ids, ws = batch[3].numpy(), batch[4].numpy()
            for p, idx, weight in zip(probabilities.ravel(), ids.ravel(), ws.ravel()):
                if weight > 0:
                    totals[int(idx)] += float(p * weight)
                    weights[int(idx)] += float(weight)
    if set(totals) != set(df.index) or any(abs(w - 1) > 1e-5 for w in weights.values()):
        raise ValueError('Question-level evaluation coverage/weight mismatch')
    return np.array([totals[i] / weights[i] for i in df.index])

def train_dkt(frames, tags, args, out):
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    np.random.seed(args.seed)
    random.seed(args.seed)
    torch.use_deterministic_algorithms(True)
    concepts = {c: i for i, c in enumerate(sorted({c for cs in tags.values() for c in cs}))}
    datasets = {k: make_windows(frame, tags, concepts, args.window, args.context) for k, frame in frames.items()}
    loaders = {k: DataLoader(v, batch_size=args.batch_size, shuffle=(k == 'train'),
                             collate_fn=collate, generator=torch.Generator().manual_seed(args.seed))
               for k, v in datasets.items()}
    model = official_dkt()(len(concepts), args.hidden, dropout=.2)
    optimizer = torch.optim.Adam(model.parameters(), lr=.001)
    history, best, stale = [], None, 0
    for epoch in range(1, args.epochs + 1):
        model.train()
        loss_total, event_total = 0., 0.
        for batch in loaders['train']:
            optimizer.zero_grad()
            probabilities = causal_predictions(model, batch)
            ws = batch[4]
            loss = (torch.nn.functional.binary_cross_entropy(probabilities, batch[1].float(), reduction='none') * ws).sum() / ws.sum()
            if not torch.isfinite(loss):
                raise ValueError('Nonfinite DKT loss')
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.)
            optimizer.step()
            loss_total += loss.item() * ws.sum().item()
            event_total += ws.sum().item()
        val = evaluate(model, loaders['val'], frames['val'])
        score = metrics(frames['val'].correct, val)
        history.append({'epoch': epoch, 'trainConceptWeightedLoss': loss_total/event_total, 'validation': score})
        print(f'pyKT DKT epoch {epoch}: train={loss_total/event_total:.6f}, val={score["log_loss"]:.6f}', flush=True)
        save(out / 'dkt-epochs.json', history)
        if best is None or score['log_loss'] < best[0]:
            best = (score['log_loss'], epoch, copy.deepcopy(model.state_dict()), val.copy())
            torch.save({'state': best[2], 'concepts': concepts, 'hidden': args.hidden}, out / 'dkt-best.pt')
            stale = 0
        else:
            stale += 1
        if stale >= args.patience:
            break
    model.load_state_dict(best[2])
    # Test is evaluated once, only after the validation-selected checkpoint.
    test = evaluate(model, loaders['test'], frames['test'])
    return best[3], test, {'selectedEpoch': best[1], 'trainingHistory': history,
        'upstreamDktSourceHash': sha(HERE / '.runtime/pykt/models/dkt.py'),
        'dktProtocol': 'official DKT forward; unidirectional; timestamp-frozen target masks; '
          'multi-concept loss weighted 1/tag count; arithmetic mean question prediction; '
          'group-complete target windows with prior overlapping context, no state carry between windows',
        'device': 'cpu', 'torchVersion': torch.__version__}
