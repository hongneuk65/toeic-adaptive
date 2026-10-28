"""Aligned sequence augmentation for the prefix-causal DCL4KT adapter.

All operations move complete (concept,item,response,concept-diff,item-diff)
tuples together. These are adapter corrections, not unmodified upstream code.
"""
from collections import defaultdict
from data import pack

PAPER_PROBABILITIES = {'mask': .2, 'crop': .1, 'summarize': .2, 'reverse': .1,
                      'permute': .1, 'segment': .1, 'higher': .1, 'lower': .1, 'concat': .1}

def replacement_pool(vocab, diffs, tags):
    pool = defaultdict(list)
    for item, index in vocab['items'].items():
        for skill in tags[item]:
            q = vocab['skills'][skill]
            pool[q].append((q, index, diffs['skill'][skill], diffs['item'][item]))
    return dict(pool)

def augment(sequences, num_skills, num_items, pool, rng, probabilities=None, pad_to=None):
    ps = PAPER_PROBABILITIES if probabilities is None else probabilities
    output = []
    length = pad_to or max(map(len, sequences))
    for original in sequences:
        rows = list(original)
        for operation, probability in ps.items():
            if not 0 <= probability <= 1:
                raise ValueError('Augmentation probability must be in [0, 1]')
            if rng.random() >= probability:
                continue
            n = len(rows)
            if operation == 'mask':
                chosen = set(rng.sample(range(n), max(1, int(n*.15))))
                rows = [(num_skills, num_items, r, qd, pd) if i in chosen else token
                        for i, token in enumerate(rows) for _, _, r, qd, pd in [token]]
            elif operation == 'crop':
                keep = max(1, int(n*.8)); start = rng.randrange(n-keep+1)
                rows = rows[start:start+keep]
            elif operation == 'summarize':
                chosen = sorted(rng.sample(range(n), max(1, int(n*.8))))
                rows = [rows[i] for i in chosen]
            elif operation == 'reverse':
                rows.reverse()
            elif operation == 'permute':
                rng.shuffle(rows)
            elif operation == 'segment':
                chunks = [rows[i:i+max(1, n//3)] for i in range(0, n, max(1, n//3))]
                rng.shuffle(chunks); rows = [token for chunk in chunks for token in chunk]
            elif operation in ('higher', 'lower'):
                changed = []
                for q, item, r, qd, pd in rows:
                    candidates = [t for t in pool.get(q, []) if t[1] != item and
                                  ((t[3] > pd) if operation == 'higher' else (t[3] < pd))]
                    if r < 2 and candidates:
                        nq, ni, nqd, npd = rng.choice(candidates)
                        changed.append((nq, ni, r, nqd, npd))
                    else:
                        changed.append((q, item, r, qd, pd))
                rows = changed
            elif operation == 'concat':
                # Only known historical responses from another train prefix.
                other = [t for t in rng.choice(sequences) if t[2] < 2]
                rows = (other + rows)[-length:]
            else:
                raise ValueError('Unknown augmentation: ' + operation)
        output.append(rows)
    return pack(output, num_skills, num_items, pad_to=length)
