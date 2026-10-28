"""Transparent logistic comparators; all features are pre-submit snapshots.

AFM/PFA use published count features with an explicitly declared item intercept
extension. log_pfa and recency_pfa are ablations, not upstream LKT replicas.
"""
from collections import defaultdict
import math
from event_blocks import event_blocks

MODELS = ('afm', 'pfa', 'log_pfa', 'recency_pfa')

def features(frame, tags, model):
    if model not in MODELS:
        raise ValueError('Unknown model')
    output = {}
    user = None
    history = defaultdict(lambda: [0, 0, None])
    completed_users = set()
    for (uid, timestamp), rows in event_blocks(frame):
        now = int(timestamp)
        if uid != user:
            if uid in completed_users:
                raise ValueError('Learner rows must be contiguous')
            completed_users.add(uid)
            user, history = uid, defaultdict(lambda: [0, 0, None])
        for row in rows:
            values = {'item:' + row.question_id: 1.0}
            for skill in tags[row.question_id]:
                wins, failures, last = history[skill]
                values['skill:' + skill] = 1.0
                if model == 'afm':
                    values['attempts:' + skill] = float(wins + failures)
                else:
                    transform = float if model == 'pfa' else math.log1p
                    values['wins:' + skill] = transform(wins)
                    values['failures:' + skill] = transform(failures)
                if model == 'recency_pfa':
                    values['seen:' + skill] = float(last is not None)
                    values['gap_days:' + skill] = (0.0 if last is None else
                        math.log1p(max(0, now-last) / 86400000))
            output[row.Index] = values
        # Never expose a sibling response to another target in this submit.
        for row in rows:
            for skill in tags[row.question_id]:
                state = history[skill]
                state[0 if row.correct else 1] += 1
                state[2] = now
    return [output[index] for index in frame.index]
