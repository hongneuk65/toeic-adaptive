"""Small dependency-free HLR fit; no artifact is released without held-out improvement.

Engineering variant: sqrt(correct/incorrect count) features, exponential half-life,
binary recall log loss. Not a reproduction of the ACL 2016 half-life loss.
"""
import argparse
import hashlib
import json
import math
import random
from pathlib import Path

PRIOR = [1.0, 1.0, -1.0]


def features(row):
    return [1.0, math.sqrt(row['wins']), math.sqrt(row['losses'])]


def predict(weights, row):
    z = sum(a * b for a, b in zip(weights, features(row)))
    h = 2 ** max(-10, min(10, z))
    return max(1e-7, min(1 - 1e-7, 2 ** (-row['lagDays'] / h)))


def loss(weights, rows):
    return sum(-r['correct'] * math.log(predict(weights, r)) - (1-r['correct']) * math.log1p(-predict(weights, r)) for r in rows) / len(rows)


def train(rows, validation):
    best = PRIOR[:]
    best_loss = loss(best, validation)
    rng = random.Random(2026)
    for rate in [0.001, 0.005, 0.01]:
        weights = PRIOR[:]
        for _ in range(30):
            shuffled = rows[:]
            rng.shuffle(shuffled)
            for row in shuffled:
                p = predict(weights, row)
                # d BCE / d log2(half-life), clipped for numerical stability.
                gradient = (p-row['correct']) * (-math.log(p)) * math.log(2) / (1-p)
                weights = [max(-20, min(20, w-rate * (max(-5, min(5, gradient*x)) + 0.001*(w-prior)))) for w, x, prior in zip(weights, features(row), PRIOR)]
            score = loss(weights, validation)
            if score < best_loss:
                best, best_loss = weights[:], score
    return best


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    rows = json.loads(args.input.read_text(encoding='utf-8'))
    rows = [r for r in rows if r['lagDays'] >= 10/1440 and r['wins'] >= 0 and r['losses'] >= 0 and r['correct'] in (0, 1)]
    users = sorted({r['learner'] for r in rows})
    if len(users) < 30 or len(rows) < 1000:
        raise SystemExit(f'Not enough eligible data: {len(users)} learners, {len(rows)} events; require >=30 and >=1000. Collect more; keep prior/fallback.')
    random.Random(2026).shuffle(users)
    train_users, val_users = set(users[:int(.6*len(users))]), set(users[int(.6*len(users)):int(.8*len(users))])
    train_rows = [r for r in rows if r['learner'] in train_users]
    val_rows = [r for r in rows if r['learner'] in val_users]
    test_rows = [r for r in rows if r['learner'] not in train_users | val_users]
    if min(map(len, [train_rows, val_rows, test_rows])) < 100:
        raise SystemExit('Insufficient events in one split (minimum 100 each).')
    weights = train(train_rows, val_rows)
    base_rate = max(1e-7, min(1-1e-7, sum(r['correct'] for r in train_rows)/len(train_rows)))
    constant_loss = sum(-r['correct']*math.log(base_rate)-(1-r['correct'])*math.log1p(-base_rate) for r in test_rows)/len(test_rows)
    per_user = {}
    for user in sorted({r['learner'] for r in test_rows}):
        subset = [r for r in test_rows if r['learner'] == user]
        per_user[user] = (loss(weights, subset)-loss(PRIOR, subset), len(subset))
    rng = random.Random(42)
    keys = list(per_user)
    deltas = []
    for _ in range(1000):
        sample = [per_user[rng.choice(keys)] for _ in keys]
        deltas.append(sum(d*n for d, n in sample)/sum(n for _, n in sample))
    deltas.sort()
    report = {'contract': 'hlr-sqrt-counts-v1', 'version': 'hlr-'+hashlib.sha256(args.input.read_bytes()).hexdigest()[:12], 'weights': weights,
              'split': 'learner-disjoint 60/20/20, seed 2026', 'counts': list(map(len, [train_rows, val_rows, test_rows])),
              'testLogLoss': loss(weights, test_rows), 'priorLogLoss': loss(PRIOR, test_rows), 'constantLogLoss': constant_loss,
              'deltaPriorBootstrap95': [deltas[25], deltas[974]], 'limitations': 'Self-selected practice; typed recall; no causal learning or TOEIC outcome validation.'}
    report['releaseGate'] = report['testLogLoss'] < min(report['priorLogLoss'], constant_loss) - .001 and deltas[974] < 0
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as output:
        json.dump(report, output, indent=2)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
