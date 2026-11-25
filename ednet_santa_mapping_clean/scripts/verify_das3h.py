"""Audit trained results against ignored local predictions; no private export."""
import hashlib
import json
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score,log_loss
from collections import Counter

ROOT=Path(__file__).resolve().parents[1]


def main():
    out=ROOT/'outputs/das3h';p=json.loads((out/'protocol.json').read_text(encoding='utf-8'))
    assert p['mapping_sha256']==hashlib.sha256((ROOT/'outputs/ednet_with_own_tags.json').read_bytes()).hexdigest()
    assert p['benchmark_code_sha256']==hashlib.sha256((ROOT/'src/das3h_test.py').read_bytes()).hexdigest()
    metrics=pd.read_csv(out/'metrics.csv');selection=pd.read_csv(out/'validation_selection.csv')
    models=['original_ednet','own_content','own_with_fallback','item_only']
    assert set(metrics.variant)==set(models)
    assert metrics.converged.all()
    splits=json.loads((out/'private/user_splits.json').read_text(encoding='utf-8'))
    for split in splits:
        train,val,test=[set(split[k]) for k in ('train','val','test')]
        assert not (train&val or val&test or train&test)
    checks=[]
    catalog=pd.read_csv(ROOT/'data/raw/ednet/questions.csv',dtype={'question_id':str})
    parts=dict(zip(catalog.question_id,'p'+catalog.part.astype(str)))
    part_metrics=[]
    for seed in p['seeds']:
        pred=pd.read_csv(out/f'private/predictions_seed{seed}.csv.gz')
        assert pred[models].notna().all().all()
        for model in models:
            row=metrics[(metrics.seed==seed)&(metrics.variant==model)&(metrics.scope=='all_test')].iloc[0]
            assert row.test_attempts==len(pred)
            assert np.isclose(row.auc,roc_auc_score(pred.correct,pred[model]))
            assert np.isclose(row.log_loss,log_loss(pred.correct,pred[model],labels=[0,1]))
            choices=selection[(selection.seed==seed)&(selection.variant==model)&selection.converged]
            assert row.C==choices.sort_values('validation_log_loss').iloc[0].C
            for part,group in pred.groupby(pred.question_id.map(parts)):
                part_metrics.append({'seed':seed,'part':part,'variant':model,'test_attempts':len(group),
                    'test_learners':group.user_id.nunique(),
                    'auc':roc_auc_score(group.correct,group[model]) if group.correct.nunique()==2 else None,
                    'log_loss':log_loss(group.correct,group[model],labels=[0,1])})
        checks.append({'seed':seed,'same_test_rows':len(pred),'models_checked':len(models)})
    report={'passed':True,'checks':checks,'all_selected_models_converged':True,
        'mapping_hash_verified':True,'code_hash_verified':True,
        'independent_metric_recompute':True,'private_logs_not_exported':True}
    (out/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    pd.DataFrame(part_metrics).to_csv(out/'per_part_metrics.csv',index=False)
    print(json.dumps(report,indent=2))


if __name__=='__main__':main()
