"""Binary Elo comparator, inspired by educational Elo applications.

Not a replica of Math Garden's response-time scoring model. Train item ratings
once; freeze them for held-out learners. New learner skill ratings start at 0.
"""
from collections import defaultdict
import math
import numpy as np
from event_blocks import event_blocks

def probability(ability, difficulty):
    return 1 / (1 + math.exp(-max(-35, min(35, ability-difficulty))))

def run(frame, tags, k, difficulties=None, fit=False):
    if not 0 < k <= 1:
        raise ValueError('k must be in (0, 1]')
    items = defaultdict(float, difficulties or {})
    abilities = defaultdict(float)
    predictions = {}
    for _, rows in event_blocks(frame):
        pending = []
        for row in rows:
            skills = tags[row.question_id]
            ability = sum(abilities[(row.user_id, s)] for s in skills) / len(skills)
            p = probability(ability, items[row.question_id])
            predictions[row.Index] = p
            pending.append((row, skills, k*(row.correct-p)))
        # Simultaneous gradients computed from the same frozen group state.
        for row, skills, delta in pending:
            for skill in skills:
                abilities[(row.user_id, skill)] += delta / len(skills)
            if fit:
                items[row.question_id] -= delta
    return np.array([predictions[i] for i in frame.index]), dict(items)
