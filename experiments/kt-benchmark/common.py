"""Frozen cohort and common learner-disjoint, timestamp-causal evaluation."""
from __future__ import annotations
import hashlib
import json
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(HERE / '.runtime'))
sys.path.insert(0, str(ROOT / 'ednet_santa_mapping_clean'))
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss, roc_auc_score

def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def save(path, value):
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False, allow_nan=False) + '\n', encoding='utf-8')

def metrics(y, p):
    y, p = np.asarray(y), np.asarray(p, dtype=float)
    if len(y) != len(p) or not np.isfinite(p).all() or ((p < 0) | (p > 1)).any():
        raise ValueError('Invalid predictions')
    return {'auc': float(roc_auc_score(y, p)) if len(set(y)) == 2 else None,
            'log_loss': float(log_loss(y, np.clip(p, 1e-7, 1-1e-7), labels=[0, 1])),
            'brier': float(brier_score_loss(y, p)), 'accuracy': float(accuracy_score(y, p >= .5)),
            'events': len(y)}

def learner_splits(df, seed=42):
    users = np.array(sorted(df.user_id.unique()))
    np.random.default_rng(seed).shuffle(users)
    a, b = int(.7 * len(users)), int(.85 * len(users))
    return {'train': set(users[:a]), 'val': set(users[a:b]), 'test': set(users[b:])}

def load_cohort():
    mapping = ROOT / 'ednet_santa_mapping_clean'
    cache = mapping / 'data/interaction_cache/u3000_e0_s2026.csv.gz'
    manifest_path = cache.with_suffix('.manifest.json')
    catalog = mapping / 'data/raw/ednet/questions.csv'
    projection = mapping / 'outputs/ednet_with_own_tags.json'
    manifest = json.loads(manifest_path.read_text())
    if manifest['signature']['catalog_sha256'] != sha(catalog):
        raise ValueError('Catalog changed since cohort creation')
    df = pd.read_csv(cache, dtype={'user_id': str})
    if len(df) != manifest['attempts'] or df.user_id.nunique() != manifest['learners']:
        raise ValueError('Cohort counts differ from audit manifest')
    tags = {r['question_id']: sorted(set(r['own_content_tag_ids']))
            for r in json.loads(projection.read_text(encoding='utf-8'))}
    if set(tags) != set(pd.read_csv(catalog).question_id):
        raise ValueError('Incomplete concept mapping')
    # The frozen projection deliberately leaves some questions without concepts.
    # Keep every source event; do not silently shrink the baseline denominator.
    # This token is a missing-label bucket, not a validated knowledge concept.
    tags = {q: cs or ['__UNTAGGED__'] for q, cs in tags.items()}
    if not df.correct.isin([0, 1]).all() or not set(df.question_id).issubset(tags):
        raise ValueError('Invalid labels or unknown items')
    ordered = df.sort_values(['user_id', 'timestamp'], kind='stable')
    if not df[['user_id', 'timestamp']].equals(ordered[['user_id', 'timestamp']]):
        raise ValueError('Cohort is not sorted')
    # Reproducible update order after simultaneous targets have been predicted.
    df = df.sort_values(['user_id', 'timestamp', 'question_id'], kind='stable').reset_index(drop=True)
    return df, tags, {'cohort': sha(cache), 'manifest': sha(manifest_path),
                      'projection': sha(projection), 'catalog': sha(catalog)}

def blocks(df):
    """Yield indices for a complete learner/timestamp; never split a submit."""
    for _, group in df.groupby(['user_id', 'timestamp'], sort=False):
        yield group
