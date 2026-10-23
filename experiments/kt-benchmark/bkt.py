"""Actual pyBKT EM fitting with timestamp-frozen online evaluation."""
from __future__ import annotations
from collections import defaultdict
from common import blocks
import numpy as np
import pandas as pd

def fit_bkt(df, tags, seed=42, num_fits=1, maxiter=40):
    from pyBKT.fit import EM_fit
    from pyBKT.generate import random_model_uni
    grouped = defaultdict(list)
    for row in df.itertuples():
        for concept in tags[row.question_id]:
            grouped[concept].append((row.user_id, row.correct))
    params, diagnostics = {}, []
    for number, (concept, rows) in enumerate(sorted(grouped.items())):
        labels, starts, lengths = [], [], []
        previous = None
        for uid, correct in rows:
            if uid != previous:
                starts.append(len(labels) + 1)
                lengths.append(0)
                previous = uid
            labels.append(int(correct) + 1)
            lengths[-1] += 1
        data = {'data': np.array([labels], dtype='int32'), 'starts': np.array(starts, dtype='int32'),
                'lengths': np.array(lengths, dtype='int32'), 'resources': np.ones(len(labels), dtype='int32')}
        best = None
        for restart in range(num_fits):
            initial = random_model_uni.random_model_uni(1, 1, rand=np.random.RandomState(seed + number*31 + restart))
            learned, likelihood = EM_fit.EM_fit(initial, data, parallel=False, maxiter=maxiter, tol=.005,
                                              fixed={'forgets': np.array([0.])})
            last = float(likelihood[-1, 0])
            if not np.isfinite(last):
                raise ValueError('Nonfinite pyBKT training likelihood')
            if best is None or last > best[0]:
                best = (last, learned, len(likelihood), len(likelihood) < maxiter)
        _, learned, iterations, stopped = best
        values = {'prior': float(learned['prior']), 'learn': float(learned['learns'][0]),
                  'guess': float(learned['guesses'][0]), 'slip': float(learned['slips'][0])}
        if not all(np.isfinite(v) and 0 <= v <= 1 for v in values.values()):
            raise ValueError('Invalid learned BKT parameter')
        params[concept] = values
        diagnostics.append({'concept': concept, 'observations': len(labels), 'iterations': iterations,
                            'stoppedBeforeLimit': stopped})
        if (number + 1) % 10 == 0:
            print(f'pyBKT fitted {number+1}/{len(grouped)} concepts', flush=True)
    return params, diagnostics

def predict_bkt(df, tags, params):
    """Predict every question once, fuse per-concept probabilities by mean.

    All questions at a submit see the prior timestamp state. Only afterwards
    update in canonical question/concept order. Unseen concepts use fixed prior.
    """
    fallback = {'prior': .5, 'learn': .1, 'guess': .25, 'slip': .1}
    predictions = pd.Series(index=df.index, dtype=float)
    state, user = {}, None
    for group in blocks(df):
        uid = group.user_id.iloc[0]
        if uid != user:
            state, user = {}, uid
        for row in group.itertuples():
            values = []
            for concept in tags[row.question_id]:
                p = params.get(concept, fallback)
                mastery = state.get(concept, p['prior'])
                values.append(mastery*(1-p['slip']) + (1-mastery)*p['guess'])
            predictions.at[row.Index] = np.mean(values)
        for row in group.itertuples():
            for concept in tags[row.question_id]:
                p = params.get(concept, fallback)
                mastery = state.get(concept, p['prior'])
                known = (1-p['slip']) if row.correct else p['slip']
                unknown = p['guess'] if row.correct else 1-p['guess']
                denominator = mastery*known + (1-mastery)*unknown
                posterior = mastery*known / max(denominator, 1e-12)
                state[concept] = posterior + (1-posterior)*p['learn']
    return predictions.to_numpy()
