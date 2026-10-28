"""One masked query per concept; context ends before its complete timestamp."""
from collections import defaultdict, deque
import numpy as np
import torch
from torch.utils.data import Dataset
from event_blocks import event_blocks

def vocabulary(train, tags):
    items = {q: i for i, q in enumerate(sorted(train.question_id.unique()))}
    skills = {c: i for i, c in enumerate(sorted({c for q in items for c in tags[q]}))}
    return {'items': items, 'skills': skills}

def difficulty(train, tags):
    # Population statistics only from train; current/test learner outcomes never fit these.
    counts = defaultdict(lambda: [0, 0])
    for row in train.itertuples():
        for key in [('item', row.question_id), *[('skill', c) for c in tags[row.question_id]]]:
            counts[key][0] += int(row.correct)
            counts[key][1] += 1
    return {kind: {key: int(round(100*w/n)) for (k, key), (w, n) in counts.items() if k == kind}
            for kind in ('item', 'skill')}

class PrefixDataset(Dataset):
    def __init__(self, frame, tags, vocab, diffs, length=100):
        if length < 2:
            raise ValueError('length must be at least 2')
        self.length, self.vocab, self.diffs = length, vocab, diffs
        self.samples = []
        history, user = deque(), None
        self.num_skills, self.num_items = len(vocab['skills']), len(vocab['items'])
        for (uid, _), rows in event_blocks(frame):
            if uid != user:
                history, user = deque(), uid
            # Context removes whole old submits, never exposing siblings.
            while history and sum(len(group) for group in history) > length-1:
                history.popleft()
            prefix = tuple(token for group in history for token in group)
            update = []
            for row in rows:
                for skill in tags[row.question_id]:
                    q = vocab['skills'].get(skill, self.num_skills)
                    item = vocab['items'].get(row.question_id, self.num_items)
                    token = (q, item, int(row.correct), diffs['skill'].get(skill, 75),
                             diffs['item'].get(row.question_id, 75))
                    target = (q, item, 2, token[3], token[4])
                    self.samples.append((prefix, target, int(row.correct), int(row.Index), 1/len(tags[row.question_id]), uid))
                    update.append(token)
            history.append(tuple(update))

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, index):
        return self.samples[index]

def pack(sequences, num_skills, num_items, pad_to=None):
    length = pad_to or max(len(s) for s in sequences)
    if any(len(s) > length or not s for s in sequences):
        raise ValueError('Empty or oversized sequence')
    batch = torch.tensor([[(num_skills+1, num_items+1, 3, 101, 101)]*length for _ in sequences], dtype=torch.long)
    mask = torch.zeros(len(sequences), length, dtype=torch.bool)
    for i, sequence in enumerate(sequences):
        batch[i, :len(sequence)] = torch.tensor(sequence)
        mask[i, :len(sequence)] = True
    return batch, mask

def collate(samples, num_skills, num_items, max_length=None):
    sequences = [list(prefix) + [target] for prefix, target, *_ in samples]
    batch, mask = pack(sequences, num_skills, num_items, pad_to=max_length)
    return {'tokens': batch, 'mask': mask, 'last': mask.sum(1)-1,
            'labels': torch.tensor([s[2] for s in samples], dtype=torch.float),
            'ids': [s[3] for s in samples], 'weights': torch.tensor([s[4] for s in samples]),
            'users': [s[5] for s in samples],
            'sequences': sequences}

def probabilities(model, batch):
    t, mask = batch['tokens'].to(model.device), batch['mask'].to(model.device)
    q, pid, r, qd, pd = t.unbind(-1)
    # Eval path never calls contrastive encoders or augmentation.
    output = model(q, r, pid, qd, pd, torch.where(r < 2, 1-r, 2),
                   torch.where(qd <= 100, 100-qd, qd), torch.where(pd <= 100, 100-pd, pd), mask)
    return output[torch.arange(len(t), device=model.device), batch['last'].to(model.device), 0]

def evaluate(model, loader, frame):
    totals, weights = defaultdict(float), defaultdict(float)
    model.eval()
    with torch.no_grad():
        for batch in loader:
            ps = probabilities(model, batch).cpu().numpy()
            for idx, p, weight in zip(batch['ids'], ps, batch['weights'].numpy()):
                totals[idx] += float(p*weight)
                weights[idx] += float(weight)
    if set(totals) != set(frame.index) or any(abs(w-1) > 1e-5 for w in weights.values()):
        raise ValueError('Missing, duplicated, or misweighted source questions')
    return np.array([totals[i]/weights[i] for i in frame.index])
