import math
import unittest
from train import PRIOR, features, loss, predict


class HlrTrainingContract(unittest.TestCase):
    def test_prediction_matches_runtime_contract(self):
        row = {'wins': 4, 'losses': 1, 'lagDays': 4, 'correct': 1}
        self.assertEqual(features(row), [1, 2, 1])
        self.assertAlmostEqual(predict(PRIOR, row), .5)

    def test_log_loss_is_finite_at_extreme_predictions(self):
        rows = [{'wins': 10000, 'losses': 0, 'lagDays': .001, 'correct': 0},
                {'wins': 0, 'losses': 10000, 'lagDays': 10000, 'correct': 1}]
        self.assertTrue(math.isfinite(loss(PRIOR, rows)))
        self.assertGreater(loss(PRIOR, rows), 0)


if __name__ == '__main__':
    unittest.main()
