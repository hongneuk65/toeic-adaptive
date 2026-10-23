"""Bounded BKT belief-space planning; not upstream ExRec or a trained RL agent."""
import math


def validate(params):
    if not params:
        raise ValueError('Empty concept panel')
    for p in params:
        if set(p) != {'prior', 'learn', 'guess', 'slip'} or any(
            isinstance(v, bool) or not isinstance(v, (int, float)) or
            not math.isfinite(v) or not 0 <= v <= 1 for v in p.values()
        ):
            raise ValueError('Invalid BKT parameters')


def branches(state, params, action):
    """Outcome probabilities and posterior after one learning opportunity."""
    m, p = state[action], params[action]
    correct = m * (1 - p['slip']) + (1 - m) * p['guess']
    for outcome, probability in ((True, correct), (False, 1 - correct)):
        if probability <= 0:
            continue
        likelihood = (1 - p['slip']) if outcome else p['slip']
        posterior = m * likelihood / probability
        updated = list(state)
        updated[action] = posterior + (1 - posterior) * p['learn']
        yield outcome, probability, tuple(updated)


def action_values(state, params, horizon=2):
    if horizon not in (1, 2):
        raise ValueError('Only bounded horizons 1 and 2 are supported')
    if len(state) != len(params) or any(not math.isfinite(m) or not 0 <= m <= 1 for m in state):
        raise ValueError('Invalid belief state')
    values = []
    for action in range(len(params)):
        expected = 0.0
        for _, probability, updated in branches(state, params, action):
            reward = (sum(updated) - sum(state)) / len(state)
            continuation = max(action_values(updated, params, 1)) if horizon == 2 else 0
            expected += probability * (reward + continuation)
        values.append(expected)
    return values


def choose(state, params, policy, rng):
    if policy == 'random':
        return rng.randrange(len(state))
    if policy == 'weakest':
        return min(range(len(state)), key=lambda i: (state[i], i))
    if policy == 'lookahead2':
        values = action_values(state, params)
        best = max(values)
        # Bayesian observations with zero learning have zero expected gain;
        # rounding noise must not manufacture a preference between actions.
        return next(i for i, value in enumerate(values) if value >= best - 1e-12)
    raise ValueError('Unknown policy')
