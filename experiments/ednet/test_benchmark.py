"""Causality checks, not model-accuracy claims."""
import unittest
from collections import Counter

import numpy as np
import torch

from benchmark import SequenceKT, collator, history_features, parse_user, split_bundles


class ProtocolTests(unittest.TestCase):
    def test_last_response_committed_at_submit(self):
        text = ('timestamp,action_type,item_id,user_answer\n'
                '100,enter,b1,\n110,respond,q1,a\n120,respond,q1,b\n'
                '125,respond,q9,a\n130,submit,b1,\n140,enter,b1,\n150,respond,q1,a\n')
        meta = {'q1': {'bundle_id': 'b1', 'correct_answer': 'b', 'skills': [1]}}
        stats = Counter()
        result = parse_user(text, meta, stats)
        self.assertEqual(result, [{'start': 100, 'end': 130, 'events': [('q1', 1)]}])
        self.assertEqual(stats['answer_changes'], 1)

    def test_no_current_bundle_labels_in_history(self):
        meta = {q: {'skills': [1]} for q in ('q1', 'q2')}
        bundles = [{'start': 100, 'end': 200, 'events': [('q1', 1), ('q2', 0)]},
                   {'start': 300, 'end': 400, 'events': [('q1', 0)]}]
        phi = history_features(bundles, meta)
        self.assertTrue(np.allclose(phi[0], 0))
        self.assertAlmostEqual(phi[1][0][0][0], np.log(2))
        self.assertAlmostEqual(phi[1][0][0][1], np.log(3))

    def test_cumulative_window_boundaries(self):
        meta = {'q1': {'skills': [1]}}
        bundles = [{'start': 0, 'end': 0, 'events': [('q1', 1)]},
                   {'start': 3_600_000, 'end': 3_600_001, 'events': [('q1', 0)]}]
        phi = history_features(bundles, meta)[1][0][0]
        self.assertEqual(phi[0], 0)
        self.assertAlmostEqual(phi[2], np.log(2))

    def test_gru_current_and_future_labels_cannot_change_current_prediction(self):
        torch.manual_seed(5)
        batch = {'q': torch.ones(1, 4, 2, dtype=torch.long),
                 's': torch.ones(1, 4, 2, 1, dtype=torch.long),
                 'smask': torch.ones(1, 4, 2, 1), 'mask': torch.ones(1, 4, 2, dtype=torch.bool),
                 'y': torch.zeros(1, 4, 2), 'gap': torch.zeros(1, 4, 1),
                 'u': torch.zeros(1, dtype=torch.long), 'base': torch.zeros(1, 4, 2)}
        for hybrid in (False, True):
            model = SequenceKT(3, 3, 1, hybrid).eval()
            if hybrid:  # Avoid a vacuous check of the zero-initialized residual head.
                torch.nn.init.normal_(model.head[-1].weight)
            before = model(batch).detach()
            changed = dict(batch, y=batch['y'].clone())
            changed['y'][:, 1:] = 1
            after = model(changed).detach()
            torch.testing.assert_close(before[:, :2], after[:, :2])
            self.assertFalse(torch.allclose(before[:, 2:], after[:, 2:]))

    def test_split_is_ordered_and_all_bundles_present(self):
        split = split_bundles(20)
        self.assertEqual(list(np.bincount(split)), [14, 3, 3])

    def test_cached_collation_keeps_split_and_padding_masks(self):
        data = {'records': [
            {'q': 1, 's': [1, 2], 'y': 1, 'gap': 0., 'split': 0},
            {'q': 2, 's': [2], 'y': 0, 'gap': 10., 'split': 1},
            {'q': 1, 's': [1], 'y': 1, 'gap': 10., 'split': 1}],
            'users': [[[0], [1, 2]]], 'max_k': 2}
        logits = np.array([.1, .2, .3], dtype=np.float32)
        train = collator(data, logits, True)([0])
        full = collator(data, logits)([0])
        self.assertEqual(train['q'].shape[1], 1)
        self.assertEqual(int(train['mask'].sum()), 1)
        self.assertEqual(int(full['mask'].sum()), 3)
        self.assertEqual(full['id'][0, 0, 1], -1)
        self.assertEqual(full['gap'][0, 1, 0], 1.)
        torch.testing.assert_close(full['base'][0, 1], torch.tensor([.2, .3]))
        self.assertEqual(full['smask'][0, 1, 0].tolist(), [1., 0.])

    def test_zero_initialized_hybrid_matches_baseline(self):
        batch = {'q': torch.ones(1, 2, 1, dtype=torch.long),
                 's': torch.ones(1, 2, 1, 1, dtype=torch.long),
                 'smask': torch.ones(1, 2, 1, 1), 'mask': torch.ones(1, 2, 1, dtype=torch.bool),
                 'y': torch.ones(1, 2, 1), 'gap': torch.zeros(1, 2, 1),
                 'u': torch.zeros(1, dtype=torch.long), 'base': torch.tensor([[[.4], [-.8]]])}
        model = SequenceKT(3, 3, 1, True).eval()
        torch.testing.assert_close(model(batch), batch['base'])


if __name__ == '__main__':
    unittest.main()
