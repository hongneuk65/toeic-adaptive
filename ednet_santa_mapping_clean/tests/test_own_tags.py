import json
import unittest
from src.pipeline import ROOT,OUT,read_csv,parse_tags
from src.own_tags import classify,own_id


class ContentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.groups=json.loads((ROOT/'config/part1_content.json').read_text(encoding='utf-8'))['groups']

    def test_person_guard(self):
        ids=lambda s:{r['group_id'] for r in classify(s,self.groups)}
        self.assertNotIn('p1_posture_observation',ids('A ladder is leaning against a house.'))
        self.assertIn('p1_objects',ids('A ladder is leaning against a house.'))
        self.assertIn('p1_posture_observation',ids('A woman is leaning against a wall.'))
        self.assertNotIn('p1_activity',ids('A boat is resting on the shore.'))
        self.assertEqual(ids('A man is not watering plants.'),set())

    def test_stable_ids_separate_axes(self):
        self.assertEqual(own_id('topic','x'),own_id('topic','x'))
        self.assertNotEqual(own_id('topic','x'),own_id('task','x'))

    def test_taxonomy_no_numeric_tag_membership(self):
        self.assertEqual(len(self.groups),6)
        self.assertTrue(all('tags' not in g for g in self.groups))
        labels=[l for g in self.groups for l in g['source_labels']]
        self.assertEqual(len(labels),len(set(labels)))


@unittest.skipUnless((OUT/'own_taxonomy.json').exists(),'Run own taxonomy first')
class ProjectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data=json.loads((OUT/'own_taxonomy.json').read_text(encoding='utf-8'))
        cls.qs=json.loads((OUT/'ednet_with_own_tags.json').read_text(encoding='utf-8'))
        cls.mappings=json.loads((OUT/'own_tag_mappings.json').read_text(encoding='utf-8'))

    def test_complete_rows_not_false_complete_labels(self):
        refs=read_csv(ROOT/'data/raw/ednet/questions.csv')
        self.assertEqual({q['question_id'] for q in refs},{q['question_id'] for q in self.qs})
        self.assertEqual(len(self.qs),len(refs))
        self.assertTrue(any(q['status']=='unresolved_no_content_label' for q in self.qs))
        for r in self.data['summary']['coverage']:
            qs=self.qs if r['part']=='all' else [q for q in self.qs if q['part']==r['part']]
            self.assertEqual(r['any_content_candidate'],sum(bool(q['own_content_tag_ids']) for q in qs))
            self.assertEqual(r['independently_validated_questions'],0)

    def test_no_cross_part_mapping_or_hidden_originals(self):
        refs={q['question_id']:q for q in read_csv(ROOT/'data/raw/ednet/questions.csv')}
        for q in self.qs:
            self.assertEqual(q['original_tags'],parse_tags(refs[q['question_id']]['tags']))
            expected={d['own_tag_id'] for d in self.mappings if d['ednet_tag_id'] in q['original_tags'] and d['part']==q['part'] and d['axis']!='accent'}
            self.assertEqual(set(q['own_content_tag_ids']),expected)
            self.assertFalse(q['semantic_validated'])
        self.assertFalse(any(q['question_content_matched'] for q in self.qs if q['part']=='p1'))

    def test_content_uses_correct_answer_not_distractors(self):
        rows=json.loads((OUT/'part1_content_candidates.json').read_text(encoding='utf-8'))
        row=next(r for r in rows if r['question_id']=='q18720')
        self.assertEqual(row['correct_text'],'She is taking a picture.')
        self.assertEqual({c['group_id'] for c in row['candidates']},{'p1_activity'})
        self.assertTrue(all(not r['media_verified'] for r in rows))
        self.assertEqual(sum(r['review_status']=='assistant_text_reviewed_not_gold' for r in rows),5)

    def test_part1_group_coverage_distinct(self):
        for g in self.data['part1_group_stats']:
            ids={q['question_id'] for q in self.qs if q['part']=='p1' and g['own_tag_id'] in q['own_content_tag_ids']}
            self.assertEqual(g['ednet_projected_questions'],len(ids))
        summary=self.data['summary']
        self.assertEqual(summary['part1_tag_ids_with_content_mapping'],18)
        self.assertEqual(summary['part1_question_id_matches'],0)
        self.assertEqual(summary['part1_groups'],6)


if __name__=='__main__':unittest.main()
