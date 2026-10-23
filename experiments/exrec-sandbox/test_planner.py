import random
import json
from pathlib import Path
import tempfile
import unittest
from planner import action_values, branches, choose, validate
from run import panel, simulate


class PlannerTests(unittest.TestCase):
    def setUp(self):
        self.params = [dict(prior=.2, learn=.1, guess=.25, slip=.1),
                       dict(prior=.7, learn=.3, guess=.25, slip=.1)]

    def test_probability_and_expected_learning_identity(self):
        state = (.2, .7)
        outcomes = list(branches(state, self.params, 0))
        self.assertAlmostEqual(sum(p for _, p, _ in outcomes), 1)
        self.assertAlmostEqual(sum(p*s[0] for _, p, s in outcomes), .2 + .8*.1)
        self.assertTrue(all(s[1] == .7 for _, _, s in outcomes))
        self.assertEqual(state, (.2, .7))

    def test_horizon_one_matches_analytic_expected_gain(self):
        for value, expected in zip(action_values((.2, .7), self.params, 1), (.04, .045)):
            self.assertAlmostEqual(value, expected)

    def test_zero_learning_has_zero_expected_reward(self):
        params = [dict(p, learn=0) for p in self.params]
        for value in action_values((.2, .7), params, 2):
            self.assertAlmostEqual(value, 0)
        self.assertEqual(choose((.2, .7), params, 'lookahead2', random.Random(1)), 0)

    def test_planning_can_differ_from_weakest(self):
        self.assertEqual(choose((.2, .7), self.params, 'weakest', random.Random(1)), 0)
        self.assertEqual(choose((.2, .7), self.params, 'lookahead2', random.Random(1)), 1)

    def test_impossible_outcome_skipped(self):
        params = [dict(prior=1, learn=0, guess=0, slip=0)]
        self.assertEqual(list(branches((1,), params, 0)), [(True, 1, (1.0,))])

    def test_validation(self):
        for value in (float('nan'), float('inf'), -.1, 1.1, True):
            with self.assertRaises(ValueError):
                validate([dict(self.params[0], learn=value)])
        with self.assertRaises(ValueError):
            action_values((.2, .7), self.params, 3)

    def test_seed_reproducibility_and_no_mutation(self):
        before = [dict(p) for p in self.params]
        first = simulate(self.params, 'lookahead2', 11, episodes=8, steps=5)
        self.assertEqual(first, simulate(self.params, 'lookahead2', 11, episodes=8, steps=5))
        self.assertEqual(before, self.params)
        self.assertTrue(0 <= first['meanConceptCoverage'] <= 1)

    def test_panel_excludes_missing_labels_and_nonconverged_fits(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as directory:
            root = Path(directory)
            names = [f'c{i}' for i in range(8)] + ['__UNTAGGED__', 'capped']
            (root / 'bkt-parameters.json').write_text(json.dumps({n: self.params[0] for n in names}))
            report = {'status': 'complete', 'model': 'bkt', 'fitDiagnostics': [
                {'concept': n, 'observations': 100 + i, 'stoppedBeforeLimit': n != 'capped'}
                for i, n in enumerate(names)]}
            (root / 'bkt-report.json').write_text(json.dumps(report))
            _, _, selected = panel(root)
            self.assertEqual([d['concept'] for d in selected], list(reversed(names[:8])))
            report['status'] = 'running'
            (root / 'bkt-report.json').write_text(json.dumps(report))
            with self.assertRaises(ValueError):
                panel(root)

    def test_horizon_two_cannot_be_worse_than_one_step_expected_gain(self):
        one = action_values((.2, .7), self.params, 1)
        two = action_values((.2, .7), self.params, 2)
        self.assertTrue(all(b >= a - 1e-12 for a, b in zip(one, two)))


if __name__ == '__main__':
    unittest.main()
