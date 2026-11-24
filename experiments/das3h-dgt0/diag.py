"""Diagnostics: why d=0 wins. Data structure + train/val gap + no-user-feature ablation."""
import json, sys, time
from pathlib import Path
import numpy as np, pandas as pd
from scipy import sparse
ROOT = Path(sys.argv[1]); OUT = Path(sys.argv[2]); sys.path.insert(0, str(ROOT))
from src.das3h_test import split_users, metrics
df = pd.read_csv(ROOT/'data/interaction_cache/u3000_e0_s2026.csv.gz', dtype={'user_id': str})
splits = split_users(df, 42); m = {k: df.user_id.isin(v).to_numpy() for k, v in splits.items()}
y = df.correct.to_numpy().astype(float); X = sparse.load_npz(OUT/'run1/X_own.npz').tocsr()
nu, nq = 2100, 13169; ns = (X.shape[1]-nu-nq)//11; hb = nu+nq+ns
R = {}
Xtr = X[m['train']]
qcnt = np.asarray(Xtr[:, nu:nu+nq].sum(0)).ravel(); seen = qcnt[qcnt > 0]
R['questions_seen_in_train'] = int(len(seen))
R['obs_per_question_train'] = {'median': float(np.median(seen)), 'mean': float(seen.mean()),
    'pct_lt10': float((seen < 10).mean()), 'pct_lt5': float((seen < 5).mean())}
sk = np.diff(X[:, nu+nq:hb].tocsr().indptr); R['skills_per_row'] = {str(k): float((sk == k).mean()) for k in range(0, 5)}
hist = np.diff(X[:, hb:].tocsr().indptr)
for s in ('train', 'test'): R[f'{s}_rows_with_no_history'] = float((hist[m[s]] == 0).mean())
R['params'] = {'d0': int(X.shape[1]+1), **{f'd{d}_extra': int(X.shape[1]*d) for d in (1, 5, 10, 20)}, 'train_rows': int(m['train'].sum())}
# does the question already determine skill set? (then question x skill and skill x skill are functions of question)
print(json.dumps(R, indent=1), flush=True)

def sig(z): return 1/(1+np.exp(-np.clip(z, -35, 35)))
def pred(P, Xs):
    z = P['b'] + Xs @ P['w']
    if P['V'] is not None:
        XV = Xs @ P['V']; z = z + .5*(np.square(XV).sum(1) - (Xs.multiply(Xs) @ np.square(P['V'])).sum(1))
    return np.clip(sig(z), 1e-7, 1-1e-7)
def ll(t, p): return float(-np.mean(t*np.log(p)+(1-t)*np.log(1-p)))
def fit(Xa, ya, Xv, yv, d, lam, seed=0, epochs=60, pat=4, lr=.005, B=2048):
    rng = np.random.default_rng(seed); n, f = Xa.shape
    P = {'b': np.log(ya.mean()/(1-ya.mean())), 'w': np.zeros(f), 'V': rng.normal(0, .01, (f, d)) if d else None}
    Mm = {k: (np.zeros_like(v) if v is not None else None) for k, v in P.items()}; Ss = {k: (np.zeros_like(v) if v is not None else None) for k, v in P.items()}
    best = (np.inf, None, 0); bad = 0; t = 0
    for ep in range(1, epochs+1):
        order = rng.permutation(n)
        for i in range(0, n, B):
            ix = order[i:i+B]; Xb = Xa[ix]; z = P['b'] + Xb @ P['w']
            if d: X2 = Xb.multiply(Xb).tocsr(); XV = Xb @ P['V']; z = z + .5*(np.square(XV).sum(1) - (X2 @ np.square(P['V'])).sum(1))
            g = (sig(z)-ya[ix])/len(ix); G = {'b': g.sum(), 'w': Xb.T @ g + lam*P['w']}
            if d: G['V'] = Xb.T @ (g[:, None]*XV) - P['V']*(X2.T @ g)[:, None] + lam*P['V']
            t += 1
            for k in G:
                Mm[k] = .9*Mm[k]+.1*G[k]; Ss[k] = .999*Ss[k]+.001*G[k]**2
                P[k] = P[k] - lr*(Mm[k]/(1-.9**t))/(np.sqrt(Ss[k]/(1-.999**t))+1e-8)
        v = ll(yv, pred(P, Xv))
        if v < best[0]-1e-6: best = (v, {k: (x.copy() if isinstance(x, np.ndarray) else x) for k, x in P.items()}, ep); bad = 0
        else:
            bad += 1
            if bad >= pat: break
    return best
rows = []
for label, Xuse in (('with_user_onehot', X), ('no_user_onehot', X[:, nu:])):
    Xa, Xv, Xt = Xuse[m['train']], Xuse[m['val']], Xuse[m['test']]
    for d, lam in ((0, 1e-6), (1, 1e-5), (5, 1e-5), (20, 1e-5)):
        t0 = time.time(); vl, P, ep = fit(Xa, y[m['train']], Xv, y[m['val']], d, lam)
        r = {'features': label, 'd': d, 'lambda': lam, 'bestEpoch': ep, 'train_ll': ll(y[m['train']], pred(P, Xa)),
             'val_ll': vl, 'test': metrics(y[m['test']], pred(P, Xt))}
        r['gap_val_minus_train'] = r['val_ll']-r['train_ll']; rows.append(r)
        print(json.dumps(r), f'{time.time()-t0:.0f}s', flush=True)
json.dump({'structure': R, 'ablation': rows}, open(OUT/'diag.json', 'w'), indent=1)
