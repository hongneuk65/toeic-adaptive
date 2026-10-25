"""Publish only aggregate benchmark evidence, never learner histories/checkpoints."""
import json
from common import HERE, save, sha

def publish():
    source = HERE / 'artifacts/seed42/comparison.json'
    result = json.loads(source.read_text(encoding='utf-8'))
    if result['status'] != 'complete' or not result['das3hReproduced']:
        raise ValueError('Only a completed, verified comparison can be published')
    for value in result['results'].values():
        if value['events'] != result['counts']['test']['events']:
            raise ValueError('Inconsistent test denominator')
    result['comparisonArtifactHash'] = sha(source)
    for name, details in result['modelDetails'].items():
        details['config'].pop('output', None)
        report = json.loads((source.parent / f'{name}-report.json').read_text(encoding='utf-8'))
        details['methodHashes'] = {filename: report['implementationHashes'][filename]
                                  for filename in ['common.py', name + '.py']}
        if name == 'bkt':
            details['fittedConcepts'] = len(report['fitDiagnostics'])
        else:
            details['torchVersion'] = report['torchVersion']
            details['upstreamDktSourceHash'] = report['upstreamDktSourceHash']
    bkt = result['modelDetails']['bkt']
    result['limitations'].extend([
        f"BKT: {bkt['fitReachedLimit']}/{bkt['fittedConcepts']} fits reached the {bkt['config']['bkt_iterations']}-iteration budget; convergence is not established for these fits",
        'elapsed training times include preparation/evaluation and concurrent CPU contention; not inference latency benchmarks',
        'bootstrap intervals condition on the selected fits and do not include model-training randomness',
    ])
    target = HERE / 'results/seed42.json'
    target.parent.mkdir(exist_ok=True)
    save(target, result)
    print('Published aggregate results: experiments/kt-benchmark/results/seed42.json')

if __name__ == '__main__':
    publish()
