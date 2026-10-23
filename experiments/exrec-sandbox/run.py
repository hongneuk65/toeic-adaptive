"""Read frozen training artifacts; publish aggregate simulated results only."""
import argparse
import hashlib
import json
from pathlib import Path
import random
import statistics
from planner import branches, choose, validate

HERE = Path(__file__).resolve().parent
DEFAULT = HERE.parent / 'kt-benchmark/artifacts/seed42'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def panel(directory):
    parameters = json.loads((directory / 'bkt-parameters.json').read_text())
    report = json.loads((directory / 'bkt-report.json').read_text())
    if report.get('status') != 'complete' or report.get('model') != 'bkt':
        raise ValueError('Expected completed BKT training report')
    # Selection uses training diagnostics only, never validation/test performance.
    eligible = [d for d in report['fitDiagnostics']
                if d['concept'] != '__UNTAGGED__' and d['stoppedBeforeLimit'] is True]
    eligible.sort(key=lambda d: (-d['observations'], d['concept']))
    selected = eligible[:8]
    if len(selected) != 8:
        raise ValueError('Need eight converged training fits')
    values = [parameters[d['concept']] for d in selected]
    validate(values)
    return values, report, selected


def simulate(params, policy, seed, episodes=50, steps=20):
    gains, coverage = [], []
    for episode in range(episodes):
        # Separate streams: random action draws cannot shift response randomness.
        responses = random.Random(seed * 100000 + episode)
        actions = random.Random(seed * 100000 + episode + 100000000)
        state = tuple(p['prior'] for p in params)
        initial, used = sum(state) / len(state), set()
        for _ in range(steps):
            action = choose(state, params, policy, actions)
            used.add(action)
            outcomes = list(branches(state, params, action))
            draw = responses.random()
            cumulative = 0.0
            for _, probability, updated in outcomes:
                cumulative += probability
                if draw < cumulative:
                    state = updated
                    break
            else:
                state = outcomes[-1][2]  # floating-point boundary only
        gains.append(sum(state) / len(state) - initial)
        coverage.append(len(used) / len(state))
    return {'meanSimulatedBeliefChange': statistics.mean(gains),
            'episodeStandardDeviation': statistics.stdev(gains),
            'meanConceptCoverage': statistics.mean(coverage)}


def run(directory):
    params, training, selected = panel(directory)
    results = []
    for scale in (0.0, 0.5, 1.0):
        environment = [dict(p, learn=p['learn'] * scale) for p in params]
        for seed in (11, 29, 47):
            for policy in ('random', 'weakest', 'lookahead2'):
                results.append({'learningRateScale': scale, 'seed': seed, 'policy': policy,
                                **simulate(environment, policy, seed)})
    return {'status': 'complete', 'experiment': 'bkt-belief-planning-sandbox-v1',
            'deploymentEligible': False, 'causalLearningGainEstablished': False,
            'scope': 'Single-concept synthetic actions; model posterior change is not human learning gain',
            'notImplemented': ['upstream ExRec MVE', 'semantic KT calibration', 'trained RL policy',
                               'item-level difficulty', 'prerequisites', 'offline causal evaluation'],
            'offlineEvaluationBlockers': ['No logged action propensity or candidate-set snapshot',
                                          'No independently validated counterfactual student simulator'],
            'sourceHashes': training['sourceHashes'],
            'artifactHashes': {name: digest(directory / name) for name in
                               ('bkt-parameters.json', 'bkt-report.json')},
            'implementationHashes': {name: digest(HERE / name) for name in ('planner.py', 'run.py')},
            'trainingSeed': training['seed'], 'panelSelection': 'Top eight converged fits by training observations',
            'panelConcepts': [d['concept'] for d in selected],
            'excludedNonconvergedFits': sum(not d['stoppedBeforeLimit'] for d in training['fitDiagnostics']),
            'episodesPerCell': 50, 'stepsPerEpisode': 20, 'planningHorizon': 2,
            'results': results}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--artifacts', type=Path, default=DEFAULT)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    # Exclusive creation prevents accidentally replacing a completed experiment.
    if args.output.exists():
        parser.error('Output already exists; choose a new path')
    result = run(args.artifacts)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('x', encoding='utf-8') as handle:
        handle.write(json.dumps(result, indent=2, allow_nan=False) + '\n')
    print(json.dumps({'status': result['status'], 'cells': len(result['results']),
                      'deploymentEligible': False}))
