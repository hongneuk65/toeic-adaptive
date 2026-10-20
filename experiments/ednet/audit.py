"""Summarize the actual prepared sample without fitting anything."""
import argparse
from collections import Counter
from pathlib import Path

import numpy as np
import torch

from benchmark import save_json


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    args = parser.parse_args()
    path = Path(args.input)
    data = torch.load(path / 'prepared.pt', weights_only=False)
    audit = {}
    for split, name in enumerate(('train', 'validation', 'test')):
        records = [r for r in data['records'] if r['split'] == split]
        audit[name] = {'n': len(records), 'correct_rate': float(np.mean([r['y'] for r in records])),
                       'parts': dict(sorted(Counter(r['part'] for r in records).items())),
                       'oov_questions': sum(r['q_oov'] for r in records),
                       'events_with_oov_tags': sum(0 in r['s'] for r in records),
                       'multi_skill_events': sum(len(r['s']) > 1 for r in records)}
    audit['bundle_sizes'] = dict(sorted(Counter(len(ids) for seq in data['users'] for ids in seq).items()))
    audit['bundles_per_user_quantiles'] = np.quantile([len(seq) for seq in data['users']], [0, .25, .5, .75, 1]).tolist()
    gaps = [data['records'][ids[0]]['gap'] for seq in data['users'] for ids in seq]
    audit['previous_bundle_gap_seconds_quantiles'] = np.expm1(np.quantile(gaps, [0, .5, .9, .99, 1])).tolist()
    for seq in data['users']:
        splits = [data['records'][ids[0]]['split'] for ids in seq]
        assert splits == sorted(splits)
        for ids in seq:
            assert len(set(data['records'][idx]['split'] for idx in ids)) == 1
    audit['all_user_splits_ordered_and_bundles_intact'] = True
    save_json(path / 'data-audit.json', audit)
    print(audit)


if __name__ == '__main__':
    main()
