import unittest
import pandas as pd
from logistic import features, MODELS

class Causality(unittest.TestCase):
    def setUp(self):
        self.frame = pd.DataFrame([
            ('a', 0, 'q', 1), ('a', 0, 'r', 0),
            ('a', 86400000, 'q', 1), ('b', 86400000, 'q', 0),
        ], columns=['user_id', 'timestamp', 'question_id', 'correct'])
        self.tags = {'q': ['s'], 'r': ['s', 't']}

    def test_current_sibling_and_future_labels_are_hidden(self):
        for model in MODELS:
            before = features(self.frame, self.tags, model)
            changed = self.frame.copy()
            changed.loc[:1, 'correct'] = 1-changed.loc[:1, 'correct']
            after = features(changed, self.tags, model)
            self.assertEqual(before[:2], after[:2])
            self.assertEqual(before[0], before[3])
            self.assertEqual(len(before), len(self.frame))

    def test_counts_and_real_time(self):
        pfa = features(self.frame, self.tags, 'pfa')[2]
        self.assertEqual((pfa['wins:s'], pfa['failures:s']), (1, 1))
        import math
        recency = features(self.frame, self.tags, 'recency_pfa')[2]
        self.assertAlmostEqual(recency['gap_days:s'], math.log(2))
        self.assertEqual(recency['seen:s'], 1)

    def test_elo_causal_and_items_frozen(self):
        from elo import run
        import numpy as np
        items = {'q': .2, 'r': -.1}
        before, _ = run(self.frame, self.tags, .1, items)
        changed = self.frame.copy()
        changed.loc[:1, 'correct'] = 1-changed.loc[:1, 'correct']
        after, _ = run(changed, self.tags, .1, items)
        np.testing.assert_allclose(before[:2], after[:2])
        self.assertEqual(before[0], before[3])
        self.assertNotEqual(before[2], after[2])
        _, frozen = run(self.frame, self.tags, .1, items)
        self.assertEqual(items, frozen)

    def test_elo_fit_and_unknown_items(self):
        from elo import run
        prediction, items = run(self.frame.iloc[:2], self.tags, .1, fit=True)
        self.assertEqual(list(prediction), [.5, .5])
        self.assertAlmostEqual(items['q'], -.05)
        self.assertAlmostEqual(items['r'], .05)
        with self.assertRaises(ValueError):
            run(self.frame, self.tags, 0)

    def test_log_count_and_multitag_features(self):
        import math
        output = features(self.frame, self.tags, 'log_pfa')
        self.assertEqual(output[1]['skill:s'], 1)
        self.assertEqual(output[1]['skill:t'], 1)
        self.assertAlmostEqual(output[2]['wins:s'], math.log(2))
        self.assertAlmostEqual(output[2]['failures:s'], math.log(2))
        self.assertEqual(features(self.frame, self.tags, 'afm')[2]['attempts:s'], 2)

    def test_fast_blocks_match_pandas_and_reject_noncontiguous_submit(self):
        from event_blocks import event_blocks
        expected = [(key, [row.Index for row in group.itertuples()])
                    for key, group in self.frame.groupby(['user_id', 'timestamp'], sort=False)]
        actual = [(key, [row.Index for row in rows]) for key, rows in event_blocks(self.frame)]
        self.assertEqual(expected, actual)
        with self.assertRaises(ValueError):
            list(event_blocks(self.frame.iloc[[0, 2, 1, 3]]))

    def test_feature_and_elo_parity_with_pandas_iterator(self):
        from unittest.mock import patch
        import numpy as np
        from elo import run
        def pandas_blocks(frame):
            for key, group in frame.groupby(['user_id', 'timestamp'], sort=False):
                yield key, list(group.itertuples())
        for model in MODELS:
            fast = features(self.frame, self.tags, model)
            with patch('logistic.event_blocks', pandas_blocks):
                self.assertEqual(fast, features(self.frame, self.tags, model))
        fast, items = run(self.frame, self.tags, .1, fit=True)
        with patch('elo.event_blocks', pandas_blocks):
            slow, slow_items = run(self.frame, self.tags, .1, fit=True)
        np.testing.assert_array_equal(fast, slow)
        self.assertEqual(items, slow_items)

if __name__ == '__main__':
    unittest.main()
