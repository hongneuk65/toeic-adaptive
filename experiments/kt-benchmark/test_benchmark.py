import unittest
from common import learner_splits, metrics
import numpy as np
import pandas as pd
from bkt import predict_bkt, fit_bkt
from compare import predict_das3h, paired_loss_interval
from dkt import make_windows, collate, causal_predictions, official_dkt, evaluate
import torch
from torch.utils.data import DataLoader

class BenchmarkContract(unittest.TestCase):
    def setUp(self):
        self.df = pd.DataFrame([
            ('a', 1, 'q1', 1), ('a', 1, 'q2', 0), ('a', 2, 'q3', 1),
            ('a', 3, 'q1', 0), ('b', 1, 'q1', 0),
        ], columns=['user_id', 'timestamp', 'question_id', 'correct'])
        self.tags = {'q1': ['c'], 'q2': ['c', 'd'], 'q3': ['d']}
        self.params = {c: {'prior': .3, 'learn': .2, 'guess': .25, 'slip': .1} for c in ['c','d']}
        self.concepts = {'c': 0, 'd': 1}

    def test_user_splits_are_disjoint_deterministic_and_exhaustive(self):
        frame = pd.DataFrame({'user_id': [str(i) for i in range(100)]})
        split = learner_splits(frame)
        self.assertEqual([len(split[k]) for k in ['train','val','test']], [70,15,15])
        self.assertEqual(set.union(*split.values()), set(frame.user_id))
        self.assertFalse(split['train'] & split['test'])
        self.assertFalse(split['val'] & split['test'])
        self.assertEqual(split, learner_splits(frame.sample(frac=1)))

    def test_bkt_never_sees_sibling_or_own_response(self):
        before = predict_bkt(self.df, self.tags, self.params)
        changed = self.df.copy()
        changed.loc[:1, 'correct'] = 1 - changed.loc[:1, 'correct']
        after = predict_bkt(changed, self.tags, self.params)
        np.testing.assert_allclose(before[:2], after[:2])
        self.assertAlmostEqual(before[0], .3*.9 + .7*.25)
        self.assertNotAlmostEqual(before[2], after[2])
        self.assertAlmostEqual(before[4], before[0])  # no state shared across learners

    def test_bkt_fuses_concepts_without_repeating_metric_rows(self):
        p = predict_bkt(self.df, self.tags, self.params)
        self.assertEqual(len(p), len(self.df))
        self.assertTrue(np.isfinite(p).all())
        fallback = predict_bkt(self.df, self.tags, {})
        self.assertTrue(((fallback >= 0) & (fallback <= 1)).all())

    def test_pyBKT_em_smoke_is_actual_library_fit(self):
        params, diagnostic = fit_bkt(self.df, self.tags, num_fits=1, maxiter=4)
        self.assertEqual(set(params), {'c','d'})
        self.assertTrue(all(d['iterations'] <= 4 for d in diagnostic))
        self.assertEqual(len(predict_bkt(self.df, self.tags, params)), 5)

    def test_bkt_online_filter_matches_upstream_on_singleton_timestamps(self):
        from pyBKT.fit import predict_onestep
        from pyBKT.generate import random_model_uni
        frame = self.df.iloc[[0, 3]].copy()
        frame.timestamp = [1, 2]
        p = self.params['c']
        model = random_model_uni.random_model_uni(1, 1, rand=np.random.RandomState(42))
        model.update(prior=p['prior'], learns=np.array([p['learn']]), forgets=np.array([0.]),
                     guesses=np.array([p['guess']]), slips=np.array([p['slip']]))
        data = {'data': np.array([[2, 1]]), 'starts': np.array([1]), 'lengths': np.array([2]), 'resources': np.ones(2, dtype=int)}
        upstream, _ = predict_onestep.run(model, data, parallel=False)
        np.testing.assert_allclose(predict_bkt(frame, self.tags, self.params), upstream, atol=1e-10)

    def test_windows_preserve_complete_submit_and_one_event_weight(self):
        windows = make_windows(self.df, self.tags, self.concepts, window=1, context=1)
        weights = {}
        for w in windows:
            for token, selected in zip(w['tokens'], w['selected']):
                if selected:
                    weights[token[2]] = weights.get(token[2], 0) + token[3]
        self.assertEqual(weights, {i: 1. for i in self.df.index})
        # First simultaneous two-question group expands to 3 tokens, same prior.
        self.assertEqual(windows[0]['previous'], [-1,-1,-1])

    def test_official_dkt_causal_mask_blocks_current_and_future_labels(self):
        torch.manual_seed(42)
        model = official_dkt()(2, 8, dropout=0.)
        model.eval()
        first = collate(make_windows(self.df.iloc[:4], self.tags, self.concepts, window=100))
        changed = self.df.iloc[:4].copy()
        changed.loc[:1, 'correct'] = 1 - changed.loc[:1, 'correct']
        second = collate(make_windows(changed, self.tags, self.concepts, window=100))
        with torch.no_grad():
            p1, p2 = causal_predictions(model, first), causal_predictions(model, second)
        torch.testing.assert_close(p1[:,:3], p2[:,:3])
        self.assertFalse(torch.allclose(p1[:,3:], p2[:,3:]))
        changed = self.df.iloc[:4].copy()
        changed.loc[3,'correct'] = 1 - changed.loc[3,'correct']
        third = collate(make_windows(changed, self.tags, self.concepts, window=100))
        with torch.no_grad():
            torch.testing.assert_close(p1, causal_predictions(model, third))

    def test_dkt_question_evaluation_covers_every_row_once_with_context(self):
        model = official_dkt()(2, 8, dropout=0.)
        windows = make_windows(self.df, self.tags, self.concepts, window=1, context=1)
        p = evaluate(model, DataLoader(windows, batch_size=2, collate_fn=collate), self.df)
        self.assertEqual(len(p), len(self.df))
        self.assertTrue(((p >= 0) & (p <= 1)).all())

    def test_dkt_freezes_a_simultaneous_group_after_real_history(self):
        frame = self.df.iloc[:4].copy()
        frame.timestamp = [0, 1, 1, 2]
        model = official_dkt()(2, 8, dropout=0.)
        model.eval()
        loader = lambda data: DataLoader(make_windows(data, self.tags, self.concepts, window=1, context=4), batch_size=2, collate_fn=collate)
        before = evaluate(model, loader(frame), frame)
        changed = frame.copy()
        changed.loc[[1,2], 'correct'] = 1 - changed.loc[[1,2], 'correct']
        after = evaluate(model, loader(changed), changed)
        np.testing.assert_allclose(before[:3], after[:3], atol=1e-7)
        self.assertNotAlmostEqual(before[3], after[3], places=7)

    def test_metric_validation_does_not_hide_invalid_predictions(self):
        self.assertAlmostEqual(metrics([0,1], [.1,.9])['brier'], .01)
        self.assertIsNone(metrics([1,1], [.8,.9])['auc'])
        with self.assertRaises(ValueError):
            metrics([0,1], [.5,float('nan')])

    def test_das3h_reference_uses_strict_window_bounds_and_frozen_submit(self):
        frame = self.df.iloc[:3].copy()
        frame.timestamp = [0, 0, 1000]
        artifact = {'intercept': 0., 'windowsMs': [None, 1000],
                    'questions': {q: {'bias': 0., 'tags': ['c']} for q in self.tags},
                    'skills': {'c': {'bias': 0., 'wins': [0.,0.], 'attempts': [1.,10.]}}}
        p = predict_das3h(frame, artifact)
        np.testing.assert_allclose(p[:2], [.5, .5])
        self.assertAlmostEqual(p[2], .75)  # lower-bound outcomes excluded from finite window

    def test_paired_intervals_resample_learners_and_preserve_zero_difference(self):
        p = np.full(len(self.df), .6)
        interval = paired_loss_interval(self.df, p, p, repeats=30)
        self.assertEqual(interval['ci95'], [0., 0.])
        self.assertEqual(interval['deltaLogLossCandidateMinusDas3h'], 0.)
        self.assertEqual(interval['unit'], 'paired learner cluster')
        better = np.where(self.df.correct, .9, .1)
        interval = paired_loss_interval(self.df, better, p, repeats=30)
        self.assertLess(interval['ci95'][1], 0)

if __name__ == '__main__':
    unittest.main()
