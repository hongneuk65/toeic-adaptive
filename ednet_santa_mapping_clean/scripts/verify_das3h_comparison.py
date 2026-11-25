"""Verify real row identity, labels, model metrics and source hashes locally."""
import hashlib
import json
from pathlib import Path
import sys
import zipfile
import argparse

import numpy as np
import pandas as pd

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from src.das3h_comparison import OUT,VARIANTS
from src.das3h_test import DEFAULT_ZIP,parse_submissions,metrics
from src.pipeline import read_csv


def main(archive=DEFAULT_ZIP,source_only=False):
    p=json.loads((OUT/'protocol.json').read_text(encoding='utf-8'))
    assert p['status']=='completed' or source_only
    assert p['own_projection_sha256']==hashlib.sha256((ROOT/'outputs/ednet_with_own_tags.json').read_bytes()).hexdigest()
    assert p['code_sha256']==hashlib.sha256((ROOT/'src/das3h_comparison.py').read_bytes()).hexdigest()
    assert p['encoder_parser_source_sha256']==hashlib.sha256((ROOT/'src/das3h_test.py').read_bytes()).hexdigest()
    sig=p['sample']['signature'];sample_path=ROOT/f"data/interaction_cache/u{sig['users']}_e0_s{sig['sampling_seed']}.csv.gz"
    sample=pd.read_csv(sample_path,dtype={'user_id':str})
    assert len(sample)==p['sample']['attempts']
    assert sample.user_id.nunique()==p['sample']['learners']
    assert sig['max_events']==0
    lengths=sample.groupby('user_id').size()
    assert lengths.min()>=10
    # Reconstruct actual completed attempts for ten sampled learners from ZIP,
    # not from model outputs. No individual rows/identifiers are exported.
    selected=set(sorted(sample.user_id.unique())[:10]);verified=0
    meta={r['question_id']:r for r in read_csv(ROOT/'data/raw/ednet/questions.csv')}
    assert Path(archive).stat().st_size==sig['raw_bytes']
    with zipfile.ZipFile(archive) as z:
        for name in z.namelist():
            if not name.endswith('.csv') or '__MACOSX' in name:continue
            uid=hashlib.sha256(('local-das3h-pilot|'+Path(name).stem).encode()).hexdigest()[:20]
            if uid not in selected:continue
            rows,_=parse_submissions(z.read(name).decode('utf-8-sig'),meta,uid)
            actual=pd.DataFrame(rows,columns=['user_id','timestamp','question_id','correct']).sort_values(['user_id','timestamp'],kind='stable').reset_index(drop=True)
            expected=sample[sample.user_id==uid].reset_index(drop=True)
            pd.testing.assert_frame_equal(actual,expected)
            verified+=1
            if verified==len(selected):break
    assert verified==10
    if source_only:
        print(json.dumps({'raw_zip_learners_reconstructed':verified,'raw_reconstruction_matches_attempt_cache':True,
            'sample_learners':int(sample.user_id.nunique()),'sample_attempts':len(sample),
            'max_event_cap':None,'min_attempts_per_learner':int(lengths.min())},indent=2))
        return
    result=pd.read_csv(OUT/'metrics.csv');selection=pd.read_csv(OUT/'validation_selection.csv')
    own=json.loads((ROOT/'outputs/ednet_with_own_tags.json').read_text(encoding='utf-8'))
    mapped_ids={q['question_id'] for q in own if q['own_content_tag_ids']}
    splits=json.loads((OUT/'private/user_splits.json').read_text(encoding='utf-8'))
    checks=[]
    for split in splits:
        train,val,test=(set(split[k]) for k in ('train','val','test'))
        assert not (train&val or train&test or val&test)
        assert train|val|test==set(sample.user_id)
        seed=split['seed'];pred=pd.read_csv(OUT/f'private/predictions_seed{seed}.csv.gz',dtype={'user_id':str})
        expected=sample[sample.user_id.isin(test)].reset_index(drop=True)
        pd.testing.assert_frame_equal(pred[['user_id','timestamp','question_id','correct']],expected)
        assert pred[list(VARIANTS)].notna().all().all()
        for name in VARIANTS:
            row=result[(result.seed==seed)&(result.variant==name)&(result.scope=='all_test')].iloc[0]
            computed=metrics(pred.correct,pred[name])
            for metric,value in computed.items():assert np.isclose(row[metric],value),(seed,name,metric)
            candidates=selection[(selection.seed==seed)&(selection.variant==name)&selection.converged]
            assert row.C==candidates.sort_values('validation_log_loss').iloc[0].C
            assert row.train_attempts==len(sample[sample.user_id.isin(train)])
            assert row.validation_attempts==len(sample[sample.user_id.isin(val)])
            for r in result[(result.seed==seed)&(result.variant==name)].itertuples():
                if r.scope=='all_test':scope=pred
                elif r.scope=='mapped_test':scope=pred[pred.question_id.isin(mapped_ids)]
                elif r.scope=='unmapped_test':scope=pred[~pred.question_id.isin(mapped_ids)]
                else:scope=pred[pred.question_id.map(lambda q:'p'+meta[q]['part'])==r.scope]
                assert r.test_attempts==len(scope)
                computed=metrics(scope.correct,scope[name])
                for metric,value in computed.items():
                    assert (pd.isna(getattr(r,metric)) if value is None else np.isclose(getattr(r,metric),value))
        checks.append({'seed':seed,'test_rows_verified':len(pred),'test_learners':len(test),'identical_rows_and_labels':True})
    assert result.converged.all()
    report={'passed':True,'raw_zip_learners_reconstructed':verified,'all_row_counts_recomputed':True,
        'test_labels_match_real_attempt_cache':True,'metrics_recomputed_from_predictions':True,
        'validation_selection_verified':True,'hashes_verified':True,'checks':checks,
        'private_interactions_not_exported':True,
        'attempts_per_learner':{'min':int(lengths.min()),'median':float(lengths.median()),
            'mean':float(lengths.mean()),'max':int(lengths.max())}}
    (OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    aggregate=pd.read_csv(OUT/'aggregate_metrics.csv')
    all_test=aggregate[aggregate.scope=='all_test'].set_index('variant')
    original=all_test.loc[VARIANTS[0]];own_result=all_test.loc[VARIANTS[1]]
    gap=own_result.auc_mean-original.auc_mean
    intervals=pd.read_csv(OUT/'paired_bootstrap.csv')
    intervals=intervals[intervals.scope=='all_test']
    lines=['# Nhận xét đối chứng DAS3H đã xác minh','',
        f"Dữ liệu thật: {len(sample):,} lượt đã nộp của {sample.user_id.nunique():,} người học; không cắt số lượt/người. Đây là cohort, không phải toàn bộ KT4.",'',
        f"- EdNet gốc, 188 tag: AUC trung bình {original.auc_mean:.6f}; log loss {original.log_loss_mean:.6f}.",
        f"- EdNet đổi nhãn OWN, 92 tag: AUC trung bình {own_result.auc_mean:.6f}; log loss {own_result.log_loss_mean:.6f}.",
        f"- Chênh AUC OWN − gốc: {gap:+.6f} (chênh tuyệt đối, không phải phần trăm năng lực dự đoán giữ lại).",'',
        '## Kết luận trong phạm vi lượt chạy này','',
        ('OWN không cải thiện AUC trung bình so với tag gốc trong lượt chạy này. Không nên thay hẳn tag gốc chỉ vì bộ nhãn mới ít hơn.' if gap<0 else 'OWN có AUC trung bình cao hơn trong lượt chạy này, nhưng chưa đủ chứng minh ưu thế phổ quát hoặc tương đương.'),
        'Giảm số nhãn là một đánh đổi độ chi tiết, không đồng nghĩa tăng chất lượng. Hiệu năng dự đoán không kiểm định tên kỹ năng về ngữ nghĩa.',
        'Dùng kết quả này làm baseline; muốn chốt taxonomy cần đánh giá xác nhận mới, protocol và tiêu chí chấp nhận đặt trước. Không chỉnh taxonomy theo test hiện tại rồi coi đây là holdout mới.','',
        '## Khoảng bất định theo seed','']
    for r in intervals.itertuples():lines.append(f'- Seed {r.seed}: delta {r.delta_auc_own_minus_original:+.6f}; 95% CI [{r.ci95_low:+.6f}, {r.ci95_high:+.6f}].')
    lines+=['','CI là paired bootstrap theo người học trong từng split. Các seed dùng cùng cohort, không độc lập hoàn toàn. CI chứa 0 không chứng minh tương đương.','',
        '## Kiểm chứng test thật','',
        '- Đọc lại và tái tạo đầy đủ log của 10 người từ ZIP; khớp bảng lượt làm dùng trong mô hình.',
        '- Đối chiếu toàn bộ hàng test, timestamp, question ID và nhãn đúng/sai với cache trích xuất thực tế.',
        '- Tính lại AUC/log loss/Brier/accuracy từ dự đoán cho toàn test, mapped/unmapped và cả 7 Part.',
        '- Kiểm tra C được chọn bằng validation, các model được chọn hội tụ; hash code/mapping không đổi.',
        '- Không sinh labels hoặc predictions giả lập. Logs/predictions cá nhân không nằm trong notebook public.',
        '', 'Tệp kiểm chứng máy đọc: outputs/das3h_comparison/verification.json.','']
    (ROOT/'docs/DAS3H_COMPARISON_REVIEW.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps(report,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--kt4',type=Path,default=DEFAULT_ZIP)
    parser.add_argument('--source-only',action='store_true')
    args=parser.parse_args();main(args.kt4,args.source_only)
