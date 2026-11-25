import unittest
import numpy as np
import pandas as pd
from src.das3h_test import encode,parse_submissions,split_users
from src.das3h_comparison import encode_history


class CausalTests(unittest.TestCase):
    def test_final_choice_submit_only(self):
        meta={'q1':{'bundle_id':'b1','correct_answer':'b'}}
        text='timestamp,action_type,item_id,user_answer\n0,enter,b1,\n1,respond,q1,a\n2,respond,q1,b\n3,submit,b1,\n4,enter,b1,\n5,respond,q1,a\n'
        rows,audit=parse_submissions(text,meta,'u1')
        self.assertEqual(rows,[('u1',3,'q1',1)])
        self.assertEqual(audit['unfinished_answered_questions'],1)

    def test_no_same_submit_leakage_or_current_label(self):
        df=pd.DataFrame([('u1',0,'q1',1),('u1',0,'q2',0),('u1',1000,'q1',1),('u1',3600000,'q1',0)],
            columns=['user_id','timestamp','question_id','correct'])
        skills={'q1':['s1'],'q2':['s1']}
        x=encode(df,skills,{'u1'}).toarray()
        np.testing.assert_array_equal(x[:2,4:],0)
        np.testing.assert_allclose(x[2,4:9],np.log1p(1))
        np.testing.assert_allclose(x[2,9:],np.log1p(2))
        self.assertAlmostEqual(x[3,13],np.log1p(1))
        changed=df.copy();changed.loc[3,'correct']=1
        np.testing.assert_array_equal(x,encode(changed,skills,{'u1'}).toarray())

    def test_same_tag_dedup_is_catalog_responsibility(self):
        df=pd.DataFrame([('u1',0,'q1',1),('u1',1000,'q1',0)],columns=['user_id','timestamp','question_id','correct'])
        x=encode(df,{'q1':[]},{'u1'}).toarray()
        self.assertEqual(x.shape,(2,2))

    def test_disjoint_students(self):
        df=pd.DataFrame({'user_id':['u'+str(i) for i in range(100)]})
        splits=split_users(df,42)
        self.assertEqual([len(splits[k]) for k in ('train','val','test')],[70,15,15])
        self.assertFalse(splits['train'] & splits['test'])
        self.assertFalse(splits['train'] & splits['val'])

    def test_larger_run_encoder_matches_reference_and_no_label_leak(self):
        df=pd.DataFrame([('u1',0,'q1',1),('u1',0,'q2',0),('u1',1000,'q1',1),('u1',3600000,'q1',0),
            ('u2',0,'q2',1),('u2',1000,'q1',0)],columns=['user_id','timestamp','question_id','correct'])
        skills={'q1':['a','b'],'q2':['b']}
        actual=encode_history(df,skills,{'u1'}).toarray()
        np.testing.assert_array_equal(actual,encode(df,skills,{'u1'}).toarray())
        changed=df.copy();changed.loc[3,'correct']=1;changed.loc[5,'correct']=1
        np.testing.assert_array_equal(actual,encode_history(changed,skills,{'u1'}).toarray())


if __name__=='__main__':unittest.main()
