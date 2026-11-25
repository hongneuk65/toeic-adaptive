"""DAS3H d=0 pilot. Same rows and causal histories for every tag variant.

Reference: https://github.com/BenoitChoffin/das3h and arXiv:1905.06873.
No latent interactions (d=0). L2 sparse logistic regression, five cumulative
windows. Not the full official libFM implementation or a semantic gold test.
"""
import argparse
import csv
import hashlib
import io
import json
import time
import warnings
import zipfile
from bisect import bisect_left,bisect_right
from collections import Counter,defaultdict
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import csr_matrix
from sklearn.exceptions import ConvergenceWarning
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score,log_loss,brier_score_loss,accuracy_score

from .pipeline import ROOT,parse_tags,read_csv

WINDOWS=(float('inf'),30*86400,7*86400,86400,3600)
DEFAULT_ZIP=Path('D:/NEU/KHOA_LUAN/DAS3H&BKT&SAKT/data/ednet_kt4/KT4.zip')
OUT=ROOT/'outputs/das3h'


def parse_submissions(text,meta,uid):
    sessions={};records=[];audit=Counter()
    rows=sorted(csv.DictReader(io.StringIO(text)),key=lambda r:int(r['timestamp']))
    for row in rows:
        action,item=row['action_type'],row['item_id'];ts=int(row['timestamp'])
        if action=='enter' and item.startswith('b'):
            if sessions.pop(item,None):audit['abandoned_sessions']+=1
            sessions[item]={}
        elif action=='respond' and item in meta:
            answer=row.get('user_answer','').strip().lower()
            if len(answer)!=1 or answer not in 'abcd':continue
            bundle=meta[item]['bundle_id']
            if bundle not in sessions:
                audit['responses_without_enter']+=1;continue
            sessions[bundle][item]=answer
        elif action=='submit' and item in sessions:
            for qid,answer in sessions.pop(item).items():
                records.append((uid,ts,qid,int(answer==meta[qid]['correct_answer'])))
    audit['unfinished_answered_questions']=sum(len(v) for v in sessions.values())
    return records,audit


def attempts(archive,users=600,events=200,seed=2026):
    archive=Path(archive);cache=ROOT/'data/interaction_cache';cache.mkdir(exist_ok=True)
    source=ROOT/'data/raw/ednet/questions.csv';meta={r['question_id']:r for r in read_csv(source)}
    signature={'raw_bytes':archive.stat().st_size,'raw_mtime_ns':archive.stat().st_mtime_ns,
        'catalog_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'parser_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'users':users,'max_events':events,'sampling_seed':seed}
    filename=cache/f'u{users}_e{events}_s{seed}.csv.gz';manifest=filename.with_suffix('.manifest.json')
    if filename.exists() and manifest.exists() and json.loads(manifest.read_text())['signature']==signature:
        return pd.read_csv(filename,dtype={'user_id':str}),json.loads(manifest.read_text())
    result=[];audit=Counter();kept=0
    with zipfile.ZipFile(archive) as z:
        names=sorted(n for n in z.namelist() if n.endswith('.csv') and '__MACOSX' not in n)
        for i in np.random.default_rng(seed).permutation(len(names)):
            member=names[i];uid=hashlib.sha256(('local-das3h-pilot|'+Path(member).stem).encode()).hexdigest()[:20]
            rows,counts=parse_submissions(z.read(member).decode('utf-8-sig'),meta,uid);audit.update(counts)
            if len(rows)<10:continue
            if events and len(rows)>events:
                cutoff=rows[events-1][1];rows=[r for r in rows if r[1]<=cutoff]
            result.extend(rows);kept+=1
            if kept%100==0:print(f'Parsed {kept} learners / {len(result)} completed attempts',flush=True)
            if kept>=users:break
    df=pd.DataFrame(result,columns=['user_id','timestamp','question_id','correct'])
    df=df.sort_values(['user_id','timestamp'],kind='stable').reset_index(drop=True)
    df.to_csv(filename,index=False)
    info={'signature':signature,'learners':kept,'attempts':len(df),'audit':dict(audit),
        'scope':'random users, first completed question attempts capped only after whole submit timestamp'}
    manifest.write_text(json.dumps(info,indent=2),encoding='utf-8')
    return df,info


def split_users(df,seed):
    users=np.array(sorted(df.user_id.unique()));np.random.default_rng(seed).shuffle(users)
    a,b=int(.7*len(users)),int(.85*len(users))
    return {'train':set(users[:a]),'val':set(users[a:b]),'test':set(users[b:])}


def encode(df,catalog_skills,train_users):
    """Return matrix exactly in input row order, using strictly prior submit times."""
    if df[['user_id','timestamp']].values.tolist()!=df.sort_values(['user_id','timestamp'],kind='stable')[['user_id','timestamp']].values.tolist():
        raise ValueError('Input must be sorted by user and timestamp')
    um={u:i for i,u in enumerate(sorted(train_users))};qm={q:i for i,q in enumerate(sorted(catalog_skills))}
    sm={t:i for i,t in enumerate(sorted({t for ts in catalog_skills.values() for t in ts}))}
    nu,nq,ns=len(um),len(qm),len(sm);skill_base=nu+nq;count_base=skill_base+ns
    indices=[];values=[];indptr=[0]
    for uid,udf in df.groupby('user_id',sort=False):
        wins,counts=defaultdict(list),defaultdict(list)
        for ts,batch in udf.groupby('timestamp',sort=False):
            now=ts/1000
            for row in batch.itertuples():
                if uid in um:indices.append(um[uid]);values.append(1.)
                indices.append(nu+qm[row.question_id]);values.append(1.)
                for tag in catalog_skills[row.question_id]:
                    sk=sm[tag];indices.append(skill_base+sk);values.append(1.)
                    for kind,hist in enumerate((wins[tag],counts[tag])):
                        stop=bisect_left(hist,now)
                        for w,bound in enumerate(WINDOWS):
                            start=0 if np.isinf(bound) else bisect_right(hist,now-bound)
                            n=stop-start
                            if n>0:indices.append(count_base+kind*ns*5+sk*5+w);values.append(np.log1p(n))
                indptr.append(len(indices))
            for row in batch.itertuples():
                for tag in catalog_skills[row.question_id]:
                    counts[tag].append(now)
                    if row.correct:wins[tag].append(now)
    return csr_matrix((values,indices,indptr),shape=(len(df),nu+nq+11*ns),dtype=np.float64)


def metrics(y,p):
    return {'auc':float(roc_auc_score(y,p)) if len(set(y))==2 else None,
        'log_loss':float(log_loss(y,p,labels=[0,1])),'brier':float(brier_score_loss(y,p)),
        'accuracy':float(accuracy_score(y,p>=.5))}


def bootstrap(pred,a,b,repeats=200,seed=2026):
    groups={u:g for u,g in pred.groupby('user_id')};users=sorted(groups);rng=np.random.default_rng(seed);deltas=[]
    for _ in range(repeats):
        sample=pd.concat([groups[u] for u in rng.choice(users,len(users),replace=True)],ignore_index=True)
        if sample.correct.nunique()==2:
            deltas.append(roc_auc_score(sample.correct,sample[a])-roc_auc_score(sample.correct,sample[b]))
    if not deltas:return {'delta_auc':None,'ci95_low':None,'ci95_high':None}
    return {'delta_auc':float(roc_auc_score(pred.correct,pred[a])-roc_auc_score(pred.correct,pred[b])),
        'ci95_low':float(np.quantile(deltas,.025)),'ci95_high':float(np.quantile(deltas,.975)),
        'unit':'student_cluster','bootstrap_repeats':len(deltas)}


def run(archive=DEFAULT_ZIP,users=600,events=200,seeds=(42,43,44),c_grid=(.1,1.,10.)):
    OUT.mkdir(parents=True,exist_ok=True);private=OUT/'private';private.mkdir(exist_ok=True)
    catalog={r['question_id']:r for r in read_csv(ROOT/'data/raw/ednet/questions.csv')}
    own_source=ROOT/'outputs/ednet_with_own_tags.json';own=json.loads(own_source.read_text(encoding='utf-8'))
    if set(catalog)!={r['question_id'] for r in own}:raise ValueError('OWN projection catalog mismatch')
    original={q:['EDNET_'+str(t) for t in parse_tags(r['tags'])] for q,r in catalog.items()}
    coarse={r['question_id']:sorted(set(r['own_content_tag_ids'])) for r in own}
    hybrid={r['question_id']:sorted(set(r['own_content_tag_ids'])|{'EDNET_FALLBACK_'+str(t) for t in r['ednet_tags_without_content_mapping']}) for r in own}
    variants={'original_ednet':original,'own_content':coarse,'own_with_fallback':hybrid,'item_only':{q:[] for q in catalog}}
    df,info=attempts(archive,users,events);y=df.correct.to_numpy();eligible={q for q in catalog if coarse[q]}
    results=[];selection=[];intervals=[];private_splits=[]
    for seed in seeds:
        split=split_users(df,seed);private_splits.append({'seed':seed,**{k:sorted(v) for k,v in split.items()}})
        masks={k:df.user_id.isin(v).to_numpy() for k,v in split.items()};pred=df.loc[masks['test'],['user_id','timestamp','question_id','correct']].copy()
        for name,skills in variants.items():
            start=time.perf_counter();X=encode(df,skills,split['train'])
            best=None
            for c in c_grid:
                model=LogisticRegression(C=c,solver='liblinear',max_iter=1000,tol=1e-5,random_state=seed)
                with warnings.catch_warnings(record=True) as caught:
                    warnings.simplefilter('always',ConvergenceWarning);model.fit(X[masks['train']],y[masks['train']])
                converged=not any(issubclass(w.category,ConvergenceWarning) for w in caught)
                val_loss=log_loss(y[masks['val']],model.predict_proba(X[masks['val']])[:,1],labels=[0,1])
                selection.append({'seed':seed,'variant':name,'C':c,'validation_log_loss':val_loss,'converged':converged})
                if converged and (best is None or val_loss<best[0]):best=(val_loss,c,model)
            if best is None:raise RuntimeError('No converged candidate: '+name)
            _,c,model=best;prob=model.predict_proba(X[masks['test']])[:,1];pred[name]=prob
            for scope in ('all_test','mapped_test','unmapped_test'):
                sub=np.ones(len(pred),dtype=bool) if scope=='all_test' else pred.question_id.isin(eligible).to_numpy()
                if scope=='unmapped_test':sub=~sub
                if not sub.any():continue
                row={'seed':seed,'variant':name,'scope':scope,**metrics(pred.correct.to_numpy()[sub],prob[sub]),
                    'test_attempts':int(sub.sum()),'test_users':pred.loc[sub,'user_id'].nunique(),
                    'train_attempts':int(masks['train'].sum()),'features':X.shape[1],
                    'catalog_skills':len({t for ts in skills.values() for t in ts}),
                    'train_observed_skills':len({t for q in df.loc[masks['train'],'question_id'] for t in skills[q]}),
                    'C':c,'converged':True,'fit_seconds':time.perf_counter()-start}
                results.append(row)
            print(f'{seed} {name}: AUC={results[-3]["auc"]:.4f} C={c}',flush=True)
        pred.to_csv(private/f'predictions_seed{seed}.csv.gz',index=False)
        for name in variants:
            if name!='original_ednet':intervals.append({'seed':seed,'comparison':name+' minus original_ednet',**bootstrap(pred,name,'original_ednet',seed=seed)})
    metrics_df=pd.DataFrame(results);metrics_df.to_csv(OUT/'metrics.csv',index=False)
    pd.DataFrame(selection).to_csv(OUT/'validation_selection.csv',index=False)
    pd.DataFrame(intervals).to_csv(OUT/'paired_bootstrap.csv',index=False)
    agg=metrics_df.groupby(['variant','scope'])[['auc','log_loss','brier','accuracy']].agg(['mean','std'])
    agg.columns=['_'.join(c) for c in agg.columns];agg.reset_index().to_csv(OUT/'aggregate_metrics.csv',index=False)
    protocol={'model':'DAS3H d=0 (sparse L2 logistic regression, no latent interactions)',
        'reference':'https://github.com/BenoitChoffin/das3h','windows_seconds':['infinity',2592000,604800,86400,3600],
        'history':'cumulative log1p wins/attempts; strictly earlier submit timestamps; labels within same submit batch invisible',
        'split':'70/15/15 student-disjoint; causal online updating within each learner, not a global calendar holdout',
        'validation':'C chosen by validation log loss, identical validation rows for all variants; no test tuning',
        'seeds':list(seeds),'c_grid':list(c_grid),'attempt_sample':info,
        'mapping_sha256':hashlib.sha256(own_source.read_bytes()).hexdigest(),
        'benchmark_code_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'catalog_questions':len(catalog),'sample_observed_questions':df.question_id.nunique(),
        'sample_mapped_attempts':int(df.question_id.isin(eligible).sum()),
        'all_variants_identical_rows':True,'no_accent_as_skill':True,
        'limits':['Small prefix sample, three splits not independent folds.','Mapping and clusters are research candidates, not independent gold.',
            'Prediction performance does not validate names of semantic skills.','Unmapped OWN items retain item bias but have no skill history.',
            'Original and OWN differ in number and granularity of skills; no proof of causality or equivalence.',
            'Interactions and per-user predictions remain private local files; not published.']}
    (OUT/'protocol.json').write_text(json.dumps(protocol,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (private/'user_splits.json').write_text(json.dumps(private_splits),encoding='utf-8')
    lines=['# DAS3H pilot với bộ tag OWN','',
        f"{info['learners']} người học, {len(df):,} lượt làm đã nộp, {df.question_id.nunique()} câu khác ID.",
        'Cùng lượt train/validation/test giữa mọi biến thể. Đánh giá online trên người học chưa có trong train, không phải global chronological holdout.','',
        '## AUC trung bình trên toàn bộ test','']
    summary=agg.reset_index()
    for r in summary[summary.scope=='all_test'].itertuples():lines.append(f'- {r.variant}: AUC {r.auc_mean:.6f} ± {r.auc_std:.6f}; log loss {r.log_loss_mean:.6f}.')
    lines+=['','Độ lệch chuẩn giữa ba seed, không phải khoảng tin cậy. CI chênh AUC được bootstrap theo người học riêng từng seed trong paired_bootstrap.csv.','',
        '## Giới hạn','']+['- '+s for s in protocol['limits']]+['',
        'Mô hình là DAS3H d=0, không phải bản libFM latent chính thức. Cửa sổ 1h/1d/7d/30d/vô hạn; regularization chọn từ validation.',
        'Nguồn phương pháp: https://github.com/BenoitChoffin/das3h ; https://arxiv.org/abs/1905.06873','']
    (ROOT/'docs/DAS3H_RESULTS.md').write_text('\n'.join(lines),encoding='utf-8')
    print(summary[summary.scope=='all_test'].to_string(index=False),flush=True)
    return metrics_df


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--kt4',type=Path,default=DEFAULT_ZIP);p.add_argument('--users',type=int,default=600)
    p.add_argument('--events',type=int,default=200)
    args=p.parse_args();run(args.kt4,args.users,args.events)
