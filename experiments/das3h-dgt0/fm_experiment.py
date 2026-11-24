"""DAS3H d>0 (logistic factorization machine) on the exact d=0 feature matrix.

Research only: does not write model.json and is not wired into the backend.
Same cohort, same learner split (seed 42), same encoder (encode_history) as
experiments/das3h-production/train.py. Selection uses validation log loss only.
"""
from __future__ import annotations
import argparse, json, sys, time, warnings
from pathlib import Path
import numpy as np
import pandas as pd
from scipy import sparse

ap = argparse.ArgumentParser()
ap.add_argument('--root', type=Path, required=True)          # ednet_santa_mapping_clean
ap.add_argument('--out', type=Path, required=True)
ap.add_argument('--dims', type=int, nargs='+', default=[0, 1, 5, 10, 20])
ap.add_argument('--lambdas', type=float, nargs='+', default=[1e-6, 1e-5, 1e-4])
ap.add_argument('--epochs', type=int, default=40)
ap.add_argument('--patience', type=int, default=3)
ap.add_argument('--batch', type=int, default=2048)
ap.add_argument('--lr', type=float, default=0.005)
ap.add_argument('--seeds', type=int, nargs='+', default=[0, 1, 2])
ap.add_argument('--boot', type=int, default=1000)
ap.add_argument('--warm', action='store_true', help='start b,w from the liblinear d=0 optimum; tune lambda on V only')
args = ap.parse_args()
sys.path.insert(0, str(args.root))
from src.das3h_comparison import encode_history  # noqa: E402
from src.das3h_test import split_users, metrics    # noqa: E402

args.out.mkdir(parents=True, exist_ok=True)
log = open(args.out / 'run.log', 'a', encoding='utf-8')
def say(*a):
    s = ' '.join(str(x) for x in a); print(s, flush=True); log.write(s + '\n'); log.flush()

# ---------------- data (identical to train.py) ----------------
cache_npz = args.out / 'X_own.npz'
df = pd.read_csv(args.root / 'data/interaction_cache/u3000_e0_s2026.csv.gz', dtype={'user_id': str})
manifest = json.loads((args.root / 'data/interaction_cache/u3000_e0_s2026.csv.manifest.json').read_text())
assert len(df) == manifest['attempts'] and df.user_id.nunique() == manifest['learners']
projection = json.loads((args.root / 'outputs/ednet_with_own_tags.json').read_text(encoding='utf-8'))
skills = {r['question_id']: sorted(set(r['own_content_tag_ids'])) for r in projection}
splits = split_users(df, 42)
masks = {k: df.user_id.isin(v).to_numpy() for k, v in splits.items()}
y = df.correct.to_numpy().astype(np.float64)
if cache_npz.exists():
    X = sparse.load_npz(cache_npz).tocsr()
else:
    t = time.time(); X = encode_history(df, skills, splits['train']).tocsr()
    sparse.save_npz(cache_npz, X); say(f'encoded {X.shape} nnz={X.nnz} in {time.time()-t:.0f}s')
say('counts', {k: int(v.sum()) for k, v in masks.items()}, 'features', X.shape[1])
Xtr, Xva, Xte = X[masks['train']], X[masks['val']], X[masks['test']]
ytr, yva, yte = y[masks['train']], y[masks['val']], y[masks['test']]
users_te = df.user_id.to_numpy()[masks['test']]

# ---------------- reference: production d=0 (liblinear, C=1) ----------------
from sklearn.linear_model import LogisticRegression
t = time.time()
lr = LogisticRegression(C=1.0, solver='liblinear', max_iter=1000, tol=1e-5, random_state=42).fit(Xtr, ytr)
p_ref = lr.predict_proba(Xte)[:, 1]
ref = {'C': 1.0, 'validationLogLoss': metrics(yva, lr.predict_proba(Xva)[:, 1])['log_loss'], **metrics(yte, p_ref)}
say('reference d=0 liblinear', json.dumps(ref), f'{time.time()-t:.0f}s')

# ---------------- logistic FM trained with Adam ----------------
def sigmoid(z): return 1.0 / (1.0 + np.exp(-np.clip(z, -35, 35)))

def predict(P, Xs, chunk=50000):
    out = np.empty(Xs.shape[0])
    for i in range(0, Xs.shape[0], chunk):
        Xb = Xs[i:i+chunk]; z = P['b'] + Xb @ P['w']
        if P['V'] is not None:
            XV = Xb @ P['V']; z += 0.5 * (np.square(XV).sum(1) - (Xb.multiply(Xb) @ np.square(P['V'])).sum(1))
        out[i:i+chunk] = sigmoid(z)
    return np.clip(out, 1e-7, 1 - 1e-7)

def logloss(yy, p): return float(-np.mean(yy*np.log(p) + (1-yy)*np.log(1-p)))

LAM_W_WARM = 1.0 / (1.0 * Xtr.shape[0])  # sklearn C=1 objective rescaled to mean loss
def fit_fm(d, lam, seed):
    rng = np.random.default_rng(seed); n, f = Xtr.shape
    lam_w, lam_v = (LAM_W_WARM, lam) if args.warm else (lam, lam)
    P = {'b': np.float64(lr.intercept_[0]) if args.warm else np.float64(np.log(ytr.mean()/(1-ytr.mean()))),
         'w': lr.coef_[0].astype(np.float64).copy() if args.warm else np.zeros(f),
         'V': rng.normal(0, 0.01, (f, d)) if d > 0 else None}
    M = {k: np.zeros_like(v) if v is not None else None for k, v in P.items()}
    S = {k: np.zeros_like(v) if v is not None else None for k, v in P.items()}
    b1, b2, eps, step = 0.9, 0.999, 1e-8, 0
    best = (np.inf, None, 0); bad = 0; hist = []
    if args.warm: best = (logloss(yva, predict(P, Xva)), {k: (v.copy() if isinstance(v, np.ndarray) else v) for k, v in P.items()}, 0)
    for ep in range(1, args.epochs + 1):
        order = rng.permutation(n)
        for i in range(0, n, args.batch):
            idx = order[i:i+args.batch]; Xb = Xtr[idx]; yb = ytr[idx]; B = len(idx)
            z = P['b'] + Xb @ P['w']
            if d > 0:
                Xb2 = Xb.multiply(Xb).tocsr(); XV = Xb @ P['V']
                z = z + 0.5 * (np.square(XV).sum(1) - (Xb2 @ np.square(P['V'])).sum(1))
            g = (sigmoid(z) - yb) / B
            G = {'b': np.float64(g.sum()), 'w': Xb.T @ g + lam_w * P['w']}
            if d > 0:
                G['V'] = Xb.T @ (g[:, None] * XV) - P['V'] * (Xb2.T @ g)[:, None] + lam_v * P['V']
            step += 1
            for k in G:
                M[k] = b1*M[k] + (1-b1)*G[k]; S[k] = b2*S[k] + (1-b2)*np.square(G[k])
                P[k] = P[k] - args.lr * (M[k]/(1-b1**step)) / (np.sqrt(S[k]/(1-b2**step)) + eps)
        vl = logloss(yva, predict(P, Xva)); hist.append(vl)
        if vl < best[0] - 1e-6:
            best = (vl, {k: (v.copy() if isinstance(v, np.ndarray) else v) for k, v in P.items()}, ep); bad = 0
        else:
            bad += 1
            if bad >= args.patience: break
    return best[1], best[0], best[2], hist

def boot_delta(p_a, p_b, reps, seed=2026):
    """Paired learner-cluster bootstrap of log loss(a) - log loss(b); positive favours b."""
    la = -(yte*np.log(p_a) + (1-yte)*np.log(1-p_a)); lb = -(yte*np.log(p_b) + (1-yte)*np.log(1-p_b))
    uid, inv = np.unique(users_te, return_inverse=True)
    sa, sb, cnt = (np.bincount(inv, la), np.bincount(inv, lb), np.bincount(inv))
    rng = np.random.default_rng(seed); ds = []
    for _ in range(reps):
        s = rng.integers(0, len(uid), len(uid))
        ds.append(sa[s].sum()/cnt[s].sum() - sb[s].sum()/cnt[s].sum())
    return {'delta': float(la.mean() - lb.mean()), 'ci95_low': float(np.quantile(ds, .025)),
            'ci95_high': float(np.quantile(ds, .975)), 'repeats': reps, 'unit': 'test learner (450), paired'}

trials = []; results = {'reference_d0_liblinear': ref, 'protocol': {
    'cohort': '3000 learners u3000_e0_s2026, learner split 70/15/15 seed 42 (same as train.py)',
    'features': 'encode_history: user one-hot (train only), question, OWN skill, log1p wins/attempts x 5 windows',
    'model': 'logistic factorization machine z=b+w.x+sum_{i<j}<v_i,v_j>x_i x_j, Adam, L2 lambda on w and V',
    'selection': 'validation log loss; test used once per selected config', 'args': {k: (str(v) if isinstance(v, Path) else v) for k, v in vars(args).items()}}}
for d in args.dims:
    for lam in args.lambdas:
        t = time.time(); P, vl, ep, hist = fit_fm(d, lam, args.seeds[0])
        trials.append({'d': d, 'lambda': lam, 'seed': args.seeds[0], 'validationLogLoss': vl, 'bestEpoch': ep,
                       'epochsRun': len(hist), 'seconds': round(time.time()-t, 1)})
        say(f'd={d} lambda={lam:g}: val logloss={vl:.6f} best_epoch={ep}/{len(hist)} ({time.time()-t:.0f}s)')
        json.dump({**results, 'trials': trials}, open(args.out / 'results.json', 'w'), indent=2)

final = {}
for d in args.dims:
    cand = [t for t in trials if t['d'] == d]; bt = min(cand, key=lambda t: t['validationLogLoss'])
    runs = []
    for seed in args.seeds:
        P, vl, ep, _ = fit_fm(d, bt['lambda'], seed); p = predict(P, Xte)
        runs.append({'seed': seed, 'validationLogLoss': vl, 'bestEpoch': ep, **metrics(yte, p),
                     'vs_reference_d0': boot_delta(p_ref, p, args.boot)})
        say(f'[test] d={d} lambda={bt["lambda"]:g} seed={seed}: {json.dumps(runs[-1])}')
    final[str(d)] = {'lambda': bt['lambda'], 'runs': runs,
                     'mean': {m: float(np.mean([r[m] for r in runs])) for m in ('auc', 'log_loss', 'brier')},
                     'std': {m: float(np.std([r[m] for r in runs])) for m in ('auc', 'log_loss', 'brier')}}
    json.dump({**results, 'trials': trials, 'test': final}, open(args.out / 'results.json', 'w'), indent=2)
say('done')
