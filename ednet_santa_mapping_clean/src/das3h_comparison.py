"""Real uncapped-history EdNet original-vs-OWN comparison; pilot preserved.

Same observed events for both variants. Student-disjoint evaluation with
causal online test histories, NOT calendar-forward or question-disjoint.
"""
import argparse
import hashlib
import json
import platform
import time
import warnings
from array import array
from bisect import bisect_left,bisect_right
from collections import defaultdict
from pathlib import Path
from itertools import groupby

import numpy as np
import pandas as pd
import scipy
import sklearn
from scipy.sparse import csr_matrix
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from threadpoolctl import threadpool_limits

from .pipeline import ROOT,read_csv,parse_tags
from .das3h_test import attempts,split_users,metrics,WINDOWS,DEFAULT_ZIP

OUT=ROOT/'outputs/das3h_comparison'
VARIANTS=('ednet_original_188','ednet_relabeled_own_92')


def encode_history(df,skills,train_users):
    """Typed buffers avoid tens of millions of Python objects on larger runs."""
    um={u:i for i,u in enumerate(sorted(train_users))};qm={q:i for i,q in enumerate(sorted(skills))}
    sm={s:i for i,s in enumerate(sorted({s for ss in skills.values() for s in ss}))}
    nu,nq,ns=len(um),len(qm),len(sm);base=nu+nq;history_base=base+ns
    indices=array('i');values=array('d');indptr=array('q',[0])
    event_rows=df[['user_id','timestamp','question_id','correct']].itertuples(index=False,name=None)
    for uid,udf in groupby(event_rows,key=lambda r:r[0]):
        wins,counts=defaultdict(list),defaultdict(list)
        previous_ts=None
        for ts,events in groupby(udf,key=lambda r:r[1]):
            batch=list(events)
            if previous_ts is not None and ts<=previous_ts:raise ValueError('History must be time sorted')
            previous_ts=ts;now=ts/1000
            for _,_,qid,correct in batch:
                if uid in um:indices.append(um[uid]);values.append(1.)
                indices.append(nu+qm[qid]);values.append(1.)
                for skill in skills[qid]:
                    sk=sm[skill];indices.append(base+sk);values.append(1.)
                    for kind,hist in enumerate((wins[skill],counts[skill])):
                        stop=bisect_left(hist,now)
                        for w,bound in enumerate(WINDOWS):
                            start=0 if np.isinf(bound) else bisect_right(hist,now-bound)
                            n=stop-start
                            if n>0:indices.append(history_base+kind*ns*5+sk*5+w);values.append(np.log1p(n))
                indptr.append(len(indices))
            for _,_,qid,correct in batch:
                for skill in skills[qid]:
                    counts[skill].append(now)
                    if correct:wins[skill].append(now)
    return csr_matrix((np.frombuffer(values,dtype=np.float64),np.frombuffer(indices,dtype=np.int32),
        np.frombuffer(indptr,dtype=np.int64)),shape=(len(df),nu+nq+11*ns))


def paired_ci(pred,repeats,seed):
    rng=np.random.default_rng(seed)
    indices=[np.asarray(ix) for ix in pred.groupby('user_id',sort=True).indices.values()]
    y=pred.correct.to_numpy();a=pred[VARIANTS[0]].to_numpy();b=pred[VARIANTS[1]].to_numpy()
    values=[]
    for _ in range(repeats):
        chosen=np.concatenate([indices[i] for i in rng.integers(0,len(indices),len(indices))])
        if np.unique(y[chosen]).size<2:continue
        values.append(metrics(y[chosen],b[chosen])['auc']-metrics(y[chosen],a[chosen])['auc'])
    return {'delta_auc_own_minus_original':metrics(y,b)['auc']-metrics(y,a)['auc'],
        'ci95_low':float(np.quantile(values,.025)),'ci95_high':float(np.quantile(values,.975)),
        'bootstrap_repeats':len(values),'unit':'paired student cluster','seed':seed}


def write_results(protocol,rows,intervals):
    metrics_df=pd.DataFrame(rows);metrics_df.to_csv(OUT/'metrics.csv',index=False)
    agg=metrics_df.groupby(['variant','scope'])[['auc','log_loss','brier','accuracy']].agg(['mean','std'])
    agg.columns=['_'.join(c) for c in agg.columns];agg=agg.reset_index()
    agg.to_csv(OUT/'aggregate_metrics.csv',index=False)
    pd.DataFrame(intervals).to_csv(OUT/'paired_bootstrap.csv',index=False)
    lines=['# DAS3H — EdNet gốc so với EdNet đổi nhãn OWN','',
        'Đã huấn luyện và test trên đáp án đúng/sai thật trong EdNet KT4. Không sinh số liệu mô phỏng.','',
        f"- Cohort: {protocol['sample']['learners']} người học; {protocol['sample']['attempts']:,} lượt đã nộp; {protocol['observed_questions']} câu khác ID.",
        '- Lấy toàn bộ lịch sử đã nộp của cohort, không giới hạn số lượt/người. Không phải toàn bộ người học KT4.',
        '- Hai biến thể dùng chính xác cùng hàng dữ liệu và user splits. Test learner-disjoint, cập nhật lịch sử sau từng batch; không phải global calendar holdout.',
        '- DAS3H d=0, sparse L2 logistic regression; không có latent interactions libFM. C chỉ chọn bằng validation.',
        '- Giữ câu chưa có nhãn OWN trong cả hai biến thể; ở bản OWN những câu này vẫn có item bias nhưng không có skill features.',
        '', '## AUC và log loss trên toàn bộ test','']
    for r in agg[agg.scope=='all_test'].itertuples():
        lines.append(f'- {r.variant}: AUC {r.auc_mean:.6f} ± {r.auc_std:.6f}; log loss {r.log_loss_mean:.6f}; Brier {r.brier_mean:.6f}.')
    lines+=['','± là SD giữa các split seed trên cùng cohort, không phải CI hay các fold độc lập.','',
        '## Chênh AUC OWN − gốc và CI bootstrap theo người học','']
    for r in intervals:
        lines.append(f"- Seed {r['seed']}, {r['scope']}: {r['delta_auc_own_minus_original']:+.6f}; 95% CI [{r['ci95_low']:+.6f}, {r['ci95_high']:+.6f}].")
    lines+=['','## Giới hạn và cách hiểu','',
        '- Tên tag/cluster chưa có gold ngữ nghĩa độc lập. AUC không xác nhận ý nghĩa tên tag.',
        '- Hai mô hình khác cả độ chi tiết nhãn, accent và độ phủ skill. Đây là so sánh hai cách biểu diễn đã chọn, không phải hiệu ứng nhân quả riêng của clustering.',
        '- Mapping đã khóa trước lượt chạy; không điều chỉnh taxonomy từ kết quả test.',
        '- Full-history cohort không đồng nghĩa đã dùng toàn bộ 297.915 người học. Không tự gọi đây là full-EdNet benchmark.',
        '- Log cá nhân, predictions và splits ở private/ bị Git ignore; chỉ báo cáo tổng hợp.',
        '- Không dùng CI bao gồm 0 để kết luận hai mô hình tương đương. Chưa đặt equivalence margin.',
        '', 'Nguồn phương pháp: https://github.com/BenoitChoffin/das3h ; https://arxiv.org/abs/1905.06873','']
    (ROOT/'docs/DAS3H_COMPARISON.md').write_text('\n'.join(lines),encoding='utf-8')
    return agg


def run(archive=DEFAULT_ZIP,users=3000,seeds=(42,43,44),c_grid=(.1,1.,10.),bootstrap_repeats=200):
    OUT.mkdir(parents=True,exist_ok=True);private=OUT/'private';private.mkdir(exist_ok=True)
    own_path=ROOT/'outputs/ednet_with_own_tags.json';raw_path=ROOT/'data/raw/ednet/questions.csv'
    own_bytes=own_path.read_bytes();own=json.loads(own_bytes);catalog=read_csv(raw_path)
    source_ids={r['question_id'] for r in catalog}
    if {r['question_id'] for r in own}!=source_ids or len(own)!=len(source_ids):raise ValueError('Catalog mismatch')
    original={r['question_id']:['EDNET_'+str(t) for t in parse_tags(r['tags'])] for r in catalog}
    relabeled={r['question_id']:sorted(set(r['own_content_tag_ids'])) for r in own}
    skill_variants={VARIANTS[0]:original,VARIANTS[1]:relabeled}
    df,sample=attempts(archive,users=users,events=0)
    if df[['user_id','timestamp']].values.tolist()!=df.sort_values(['user_id','timestamp'],kind='stable')[['user_id','timestamp']].values.tolist():raise ValueError('Unsorted events')
    y=df.correct.to_numpy();mapped=df.question_id.map(lambda q:bool(relabeled[q])).to_numpy()
    partmap={r['question_id']:'p'+r['part'] for r in catalog}
    protocol={'status':'running','sample':sample,'max_events_per_learner':None,
        'model':'DAS3H d=0 sparse L2 logistic regression','split':'student-disjoint 70/15/15, causal online histories',
        'seeds':list(seeds),'C_grid':list(c_grid),'C_selection':'minimum validation log loss among converged candidates',
        'observed_questions':int(df.question_id.nunique()),'observed_parts':{k:int(v) for k,v in df.question_id.map(partmap).value_counts().items()},
        'catalog_questions':len(catalog),'skill_counts':{name:len({t for ts in skills.values() for t in ts}) for name,skills in skill_variants.items()},
        'windows_seconds':['infinity',2592000,604800,86400,3600],'same_rows_both_variants':True,
        'own_projection_sha256':hashlib.sha256(own_bytes).hexdigest(),'catalog_sha256':hashlib.sha256(raw_path.read_bytes()).hexdigest(),
        'code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'encoder_parser_source_sha256':hashlib.sha256((ROOT/'src/das3h_test.py').read_bytes()).hexdigest(),
        'versions':{'python':platform.python_version(),'numpy':np.__version__,'pandas':pd.__version__,'scipy':scipy.__version__,'sklearn':sklearn.__version__},
        'prior_pilot_preserved':True,'mapping_frozen_before_fit':True,'all_kt4_users_used':False}
    (OUT/'protocol.json').write_text(json.dumps(protocol,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    rows=[];selection=[];intervals=[];split_records=[]
    for seed in seeds:
        splits=split_users(df,seed);split_records.append({'seed':seed,**{k:sorted(v) for k,v in splits.items()}})
        masks={k:df.user_id.isin(v).to_numpy() for k,v in splits.items()}
        pred=df.loc[masks['test'],['user_id','timestamp','question_id','correct']].copy().reset_index(drop=True)
        print(f'Seed {seed}: train={masks["train"].sum():,}, val={masks["val"].sum():,}, test={masks["test"].sum():,}',flush=True)
        for name,skills in skill_variants.items():
            start=time.perf_counter();print(f'Encoding {seed} {name}',flush=True)
            X=encode_history(df,skills,splits['train']);print(f'Encoded: shape={X.shape}, nonzeros={X.nnz:,}',flush=True)
            Xtrain=X[masks['train']];Xval=X[masks['val']];Xtest=X[masks['test']];best=None
            for c in c_grid:
                model=LogisticRegression(C=c,solver='liblinear',max_iter=1000,tol=1e-5,random_state=seed)
                with threadpool_limits(limits=1),warnings.catch_warnings(record=True) as caught:
                    warnings.simplefilter('always',ConvergenceWarning);model.fit(Xtrain,y[masks['train']])
                converged=not any(issubclass(w.category,ConvergenceWarning) for w in caught)
                score=metrics(y[masks['val']],model.predict_proba(Xval)[:,1])['log_loss']
                selection.append({'seed':seed,'variant':name,'C':c,'validation_log_loss':score,'converged':converged})
                pd.DataFrame(selection).to_csv(OUT/'validation_selection.csv',index=False)
                print(f'Fit {seed} {name} C={c}: val_logloss={score:.6f}, converged={converged}',flush=True)
                if converged and (best is None or score<best[0]):best=(score,c,model)
            if best is None:raise RuntimeError('No converged model')
            _,c,model=best;prob=model.predict_proba(Xtest)[:,1];pred[name]=prob
            test_mapped=mapped[masks['test']]
            scopes={'all_test':np.ones(len(pred),dtype=bool),'mapped_test':test_mapped,'unmapped_test':~test_mapped}
            scopes.update({p:pred.question_id.map(partmap).eq(p).to_numpy() for p in ['p'+str(i) for i in range(1,8)]})
            for scope,mask in scopes.items():
                if not mask.any():continue
                rows.append({'seed':seed,'variant':name,'scope':scope,**metrics(pred.correct.to_numpy()[mask],prob[mask]),
                    'train_attempts':int(masks['train'].sum()),'validation_attempts':int(masks['val'].sum()),
                    'test_attempts':int(mask.sum()),'test_learners':pred.loc[mask,'user_id'].nunique(),
                    'C':c,'converged':True,'catalog_skills':protocol['skill_counts'][name],
                    'train_observed_skills':len({t for q in df.loc[masks['train'],'question_id'] for t in skills[q]}),
                    'features':X.shape[1],'fit_seconds':time.perf_counter()-start})
            pd.DataFrame(rows).to_csv(OUT/'metrics.csv',index=False)
            pred.to_csv(private/f'predictions_seed{seed}.csv.gz',index=False)
            print(f'TEST {seed} {name}: AUC={metrics(pred.correct,prob)["auc"]:.6f}',flush=True)
            del X,Xtrain,Xval,Xtest,model,best
        for scope in ('all_test','mapped_test','unmapped_test'):
            sub=pred if scope=='all_test' else pred[pred.question_id.map(lambda q:bool(relabeled[q]))==(scope=='mapped_test')]
            if not sub.empty and sub.correct.nunique()==2:
                intervals.append({'scope':scope,**paired_ci(sub,bootstrap_repeats,seed)})
        (private/'user_splits.json').write_text(json.dumps(split_records),encoding='utf-8')
        write_results(protocol,rows,intervals)
    if hashlib.sha256(own_path.read_bytes()).hexdigest()!=protocol['own_projection_sha256']:raise ValueError('Mapping changed during experiment')
    protocol['status']='completed'
    (OUT/'protocol.json').write_text(json.dumps(protocol,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    agg=write_results(protocol,rows,intervals);print(agg[agg.scope=='all_test'].to_string(index=False),flush=True)
    return agg


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--kt4',type=Path,default=DEFAULT_ZIP);p.add_argument('--users',type=int,default=3000)
    args=p.parse_args();run(args.kt4,args.users)
