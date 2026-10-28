import argparse
import functools
import random
import sys
import tempfile
import unittest
from pathlib import Path

parser = argparse.ArgumentParser(add_help=False)
parser.add_argument('--upstream', type=Path, required=True)
args, remaining = parser.parse_known_args()
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'kt-benchmark'))
import pandas as pd
import torch
from data import PrefixDataset, vocabulary, difficulty, collate, probabilities
from augmentation import augment, replacement_pool, PAPER_PROBABILITIES
from upstream import load_model
from runner import recipe, create_model, forward_training

class Contracts(unittest.TestCase):
    def setUp(self):
        torch.set_num_threads(2)
        self.frame = pd.DataFrame([('a', 1, 'q1', 1), ('a', 1, 'q2', 0),
            ('a', 2, 'q1', 0), ('b', 1, 'q1', 1)],
            columns=['user_id', 'timestamp', 'question_id', 'correct'])
        self.tags = {'q1': ['s'], 'q2': ['s', 't']}
        self.vocab = vocabulary(self.frame, self.tags)
        self.diffs = difficulty(self.frame, self.tags)
        self.dataset = PrefixDataset(self.frame, self.tags, self.vocab, self.diffs, 16)
        self.collate = functools.partial(collate, num_skills=2, num_items=2, max_length=16)

    def test_prefix_freezes_whole_timestamp_and_current_label(self):
        changed = self.frame.copy(); changed.loc[:1, 'correct'] = 1-changed.loc[:1, 'correct']
        other = PrefixDataset(changed, self.tags, self.vocab, self.diffs, 16)
        for i in range(3):
            self.assertEqual(self.dataset[i][:2], other[i][:2])
            self.assertEqual(self.dataset[i][1][2], 2)
        self.assertNotEqual(self.dataset[3][0], other[3][0])
        self.assertEqual(self.dataset[0][0], self.dataset[4][0])

    def test_question_weights_and_group_complete_history(self):
        weights = {}
        for _, _, _, idx, weight, _ in self.dataset:
            weights[idx] = weights.get(idx, 0)+weight
        self.assertEqual(weights, {0: 1, 1: 1, 2: 1, 3: 1})
        tiny = PrefixDataset(self.frame, self.tags, self.vocab, self.diffs, 2)
        self.assertEqual(tiny[3][0], ())  # cannot fit previous 3-token submit

    def test_train_only_vocabulary_and_difficulty(self):
        train = self.frame.iloc[:1]
        vocab = vocabulary(train, self.tags); diffs = difficulty(train, self.tags)
        self.assertNotIn('q2', vocab['items'])
        self.assertEqual(diffs['item'], {'q1': 100})
        dataset = PrefixDataset(self.frame, self.tags, vocab, diffs)
        self.assertEqual(dataset[1][1][1], len(vocab['items']))
        self.assertEqual(dataset[1][1][4], 75)

    def test_all_augmentations_preserve_alignment_and_masked_queries(self):
        sequences = [[(0, 0, 1, 50, 50), (0, 1, 0, 50, 25), (0, 0, 2, 50, 50)]]
        pool = {0: [(0, 0, 50, 50), (0, 1, 50, 25)]}
        for operation in PAPER_PROBABILITIES:
            result, mask = augment(sequences, 1, 2, pool, random.Random(42), {operation: 1})
            self.assertTrue(mask.any())
            for q, item, response, qd, pd in result[0][mask[0]].tolist():
                self.assertIn(response, [0, 1, 2])
                if q < 1:
                    self.assertEqual((qd, pd), (50, 50 if item == 0 else 25))
        original = list(sequences[0])
        augment(sequences, 1, 2, pool, random.Random(1))
        self.assertEqual(sequences[0], original)

    def test_real_upstream_forward_backward_and_counterfactual(self):
        cls = load_model(args.upstream)
        torch.manual_seed(42)
        model = create_model(cls, self.vocab, recipe(True), True)
        batch = self.collate([self.dataset[i] for i in range(len(self.dataset))])
        model.eval()
        before = probabilities(model, batch).detach()
        changed = self.frame.copy(); changed.loc[:1, 'correct'] = 1-changed.loc[:1, 'correct']
        other = PrefixDataset(changed, self.tags, self.vocab, self.diffs, 16)
        other_batch = self.collate([other[i] for i in range(len(other))])
        after = probabilities(model, other_batch).detach()
        torch.testing.assert_close(before[:3], after[:3], rtol=0, atol=0)
        self.assertTrue(torch.isfinite(before).all())
        model.train()
        bce, cl = forward_training(model, batch, True, replacement_pool(self.vocab, self.diffs, self.tags), random.Random(42))
        (bce*.9+cl*.1).backward()
        self.assertTrue(all(torch.isfinite(p.grad).all() for p in model.parameters() if p.grad is not None))
        self.assertTrue(model.generator[1].weight.grad.abs().sum() > 0)

    def test_upstream_hash_rejects_unreviewed_code(self):
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / 'src/models'; source.mkdir(parents=True)
            (source / 'cl_monacobert.py').write_text('raise Exception("must not execute")')
            with self.assertRaises(ValueError):
                load_model(directory)

    def test_prediction_does_not_depend_on_other_batch_lengths(self):
        cls = load_model(args.upstream)
        torch.manual_seed(42)
        model = create_model(cls, self.vocab, recipe(True), False); model.eval()
        short = probabilities(model, self.collate([self.dataset[0]])).detach()
        mixed = probabilities(model, self.collate([self.dataset[0], self.dataset[3]])).detach()
        torch.testing.assert_close(short[0], mixed[0], atol=1e-6, rtol=0)

    def test_released_contrastive_gradient_couples_via_position_embedding(self):
        cls = load_model(args.upstream)
        torch.manual_seed(42)
        model = create_model(cls, self.vocab, recipe(True), False); model.train()
        batch = self.collate([self.dataset[i] for i in range(len(self.dataset))])
        _, cl = forward_training(model, batch, False, {}, random.Random(42))
        cl.backward()
        self.assertIsNone(model.encoder[0].attn.query.weight.grad)
        self.assertIsNotNone(model.emb_p.weight.grad)

if __name__ == '__main__':
    unittest.main(argv=[sys.argv[0], *remaining])
