"""Shared coarse IDs, content-based Part1 candidates and full EdNet reprojection.

No inference of unknown EdNet IDs from unrelated Santa questions. Preserve
three distinct notions: input row coverage, candidate label coverage, validation.
"""
import hashlib
import json
import re
from collections import Counter, defaultdict

from .pipeline import ROOT, OUT, AXES, parse_tags, read_csv, write_csv, write_json

PERSON=re.compile(r"\b(he|she|they|man|men|woman|women|people|person|workers?|customers?|driver|server)\b",re.I)


def classify(text,groups):
    if not text or re.search(r"\b(not|never|no longer)\b|n't\b",text,re.I):return []
    result=[]
    for g in groups:
        if g.get('requires_person') and not PERSON.search(text):continue
        spans=[m.group() for m in re.finditer(g['pattern'],text,re.I)]
        if spans:result.append({'group_id':g['id'],'matched_spans':spans,'source':'correct_choice_text_rule','status':'pending_text_review'})
    return result


def own_id(axis,label):
    return 'OWN_'+axis.upper()+'_'+hashlib.sha256((axis+'|'+label).encode()).hexdigest()[:12].upper()


def build():
    source=OUT/'tag_mapping.json';content_source=OUT/'normalized_santa.json';config_path=ROOT/'config/part1_content.json'
    config=json.loads(config_path.read_text(encoding='utf-8'));groups=config['groups']
    legacy_to_coarse={l:g['id'] for g in groups for l in g['source_labels']}
    if len(legacy_to_coarse)!=sum(len(g['source_labels']) for g in groups):raise ValueError('Duplicate Part1 parent membership')
    mapping=json.loads(source.read_text(encoding='utf-8'))
    normalized=json.loads(content_source.read_text(encoding='utf-8'))
    names=json.loads((OUT/'label_names.json').read_text(encoding='utf-8'))
    names.update({g['id']:g['name'] for g in groups})
    # Classify all actual Santa Part1 content, not distractors or lecture title snippets.
    content=[]
    for q in normalized:
        if q['part']!='p1':continue
        candidates=classify(q['correct_text'],groups) if q['answer_valid'] and not q['duplicate_conflict'] else []
        content.append({'question_id':q['question_id'],'correct_text':q['correct_text'],
            'source_raws':q['all_sources'],'correct_choice_index':q['answer_indices'],
            'explanation':q['explanation'],'candidates':candidates,'review_status':'pending',
            'media_verified':False,'duplicate_conflict':q['duplicate_conflict']})
    review_path=ROOT/'config/part1_text_reviews.json'
    review=json.loads(review_path.read_text(encoding='utf-8'))
    by_content={q['question_id']:q for q in content};seen=set();valid_groups={g['id'] for g in groups}
    for decision in review['decisions']:
        q=by_content[decision['question_id']]
        if q['question_id'] in seen or q['correct_text']!=decision['correct_text'] or q['duplicate_conflict']:
            raise ValueError('Review duplicate or changed source content: '+q['question_id'])
        if not decision['rationale'] or not set(decision['groups'])<=valid_groups:
            raise ValueError('Invalid text review')
        seen.add(q['question_id'])
        q['candidates']=[{'group_id':g,'source':'assistant_correct_text_review',
            'status':'assistant_review_not_independent_gold','rationale':decision['rationale']} for g in decision['groups']]
        q['review_status']='assistant_text_reviewed_not_gold'
    dictionary={};tag_mappings=[];by_tagpart=defaultdict(list)
    for tag in mapping['tags']:
        for d in tag['mappings']:
            if not d.get('label'):continue
            label=legacy_to_coarse.get(d['label'],d['label']) if d['part']=='p1' else d['label']
            oid=own_id(d['axis'],label)
            dictionary.setdefault(oid,{'own_tag_id':oid,'axis':d['axis'],'label':label,
                'name':names.get(label,label),'source_tag_part_pairs':[], 'semantic_validated':False})
            pair={'tag_id':tag['tag_id'],'part':d['part']}
            if pair not in dictionary[oid]['source_tag_part_pairs']:dictionary[oid]['source_tag_part_pairs'].append(pair)
            row={'ednet_tag_id':tag['tag_id'],'part':d['part'],'own_tag_id':oid,'axis':d['axis'],
                'source':d['source'],'source_label':d['label'],'status':d['status'],
                'precision_observed':d.get('precision_observed'),'observed':d.get('observed'),
                'lecture_ids':d.get('lecture_ids',[]),'semantic_validated':False}
            if row not in by_tagpart[tag['tag_id'],d['part']]:
                tag_mappings.append(row);by_tagpart[tag['tag_id'],d['part']].append(row)
    refs=read_csv(ROOT/'data/raw/ednet/questions.csv');questions=[];pending=[]
    occurrence=Counter();matched=read_csv(OUT/'matched_questions.csv')
    bridged_ids={q['question_id'] for q in matched}
    for q in refs:
        part='p'+q['part'];tt=parse_tags(q['tags']);semantic=set();attrs=set();evidence=[];unmapped=[]
        for t in tt:
            ds=by_tagpart[t,part]
            if not any(r['axis']!='accent' for r in ds):
                unmapped.append(t);occurrence[t,part]+=1
            for row in ds:
                (attrs if row['axis']=='accent' else semantic).add(row['own_tag_id'])
                evidence.append({'ednet_tag_id':t,'own_tag_id':row['own_tag_id'],'source':row['source'],'status':row['status']})
        questions.append({'question_id':q['question_id'],'bundle_id':q['bundle_id'],'part':part,
            'original_tags':tt,'own_content_tag_ids':sorted(semantic),'own_attribute_tag_ids':sorted(attrs),
            'ednet_tags_without_content_mapping':unmapped,'mapping_evidence':evidence,
            'question_content_matched':q['question_id'] in bridged_ids,
            'status':'candidate_projection' if semantic else 'unresolved_no_content_label',
            'semantic_validated':False})
    for (t,part),n in sorted(occurrence.items()):
        ds=by_tagpart[t,part]
        record=next(r for r in mapping['tags'] if r['tag_id']==t)
        reason='attribute_only_in_part' if any(d['axis']=='accent' for d in ds) else ('no_part1_question_bridge_or_semantic_anchor' if part=='p1' else 'no_eligible_semantic_mapping')
        pending.append({'ednet_tag_id':t,'part':part,'affected_questions':n,'reason':reason,
            'bridge_questions_all_parts':record['bridge_questions'],'action':'keep_unknown_review_content_or_find_more_source_evidence'})
    stats=[]
    for p in ['all']+['p'+str(i) for i in range(1,8)]:
        qs=questions if p=='all' else [q for q in questions if q['part']==p]
        stats.append({'part':p,'total_questions':len(qs),'rows_exported':len(qs),
            'any_content_candidate':sum(bool(q['own_content_tag_ids']) for q in qs),
            'all_original_tags_have_content_mapping':sum(bool(q['original_tags']) and not q['ednet_tags_without_content_mapping'] for q in qs),
            'unresolved_questions':sum(not q['own_content_tag_ids'] for q in qs),'independently_validated_questions':0})
    clusters=[]
    for oid,d in dictionary.items():
        members=sorted({r['tag_id'] for r in d['source_tag_part_pairs']})
        if len(members)>1 and d['axis']!='accent':
            clusters.append({'own_tag_id':oid,'name':d['name'],'members':members,
                'member_part_scopes':d['source_tag_part_pairs'],'operator':'OR within declared scopes',
                'method':'shared_coarse_content_label_parent','semantic_equivalence_validated':False})
    inputs=[source,content_source,config_path,OUT/'label_names.json',OUT/'matched_questions.csv',
            ROOT/'data/raw/ednet/questions.csv',ROOT/'src/own_tags.py',review_path]
    manifest={p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs}
    snapshot=hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest()
    group_stats=[]
    for g in groups:
        oid=own_id('topic',g['id'])
        group_stats.append({'id':g['id'],'own_tag_id':oid,'name':g['name'],
            'ednet_members':sorted({r['ednet_tag_id'] for r in tag_mappings if r['own_tag_id']==oid and r['part']=='p1'}),
            'crawl_candidate_questions':sum(any(c['group_id']==g['id'] for c in q['candidates']) for q in content),
            'ednet_projected_questions':sum(oid in q['own_content_tag_ids'] for q in questions if q['part']=='p1'),
            'validation_basis':'lecture_anchor_for_ednet_and_independent_correct_text_for_crawl_not_question_identity'})
    summary={'snapshot':snapshot,'source_mapping_snapshot':mapping['snapshot'],
        'original_ednet_tags':len(mapping['tags']),'own_content_tags':sum(d['axis']!='accent' for d in dictionary.values()),
        'own_attribute_tags':sum(d['axis']=='accent' for d in dictionary.values()),'coarse_parent_clusters':len(clusters),
        'part1_groups':len(groups),'part1_tag_ids_with_content_mapping':len({d['ednet_tag_id'] for d in tag_mappings if d['part']=='p1' and d['axis']!='accent'}),
        'part1_crawl_questions':len(content),'part1_crawl_with_candidates':sum(bool(q['candidates']) for q in content),
        'part1_crawl_unresolved':sum(not q['candidates'] for q in content),
        'part1_assistant_text_reviewed':len(seen),
        'part1_question_id_matches':sum(q['question_content_matched'] for q in questions if q['part']=='p1'),
        'pending_tag_part_pairs':len(pending),'coverage':stats,'gold_accuracy':None,'release_status':'research_candidate_not_final'}
    result={'schema_version':1,'summary':summary,'dictionary':sorted(dictionary.values(),key=lambda d:d['own_tag_id']),
        'part1_group_stats':group_stats,'clusters':clusters,
        'limitations':['Part1 semantic mapping still relies on lecture anchors, not matched EdNet question contents.',
            'Crawl correct-choice rules have not been validated against images/audio or independent human gold.',
            'All EdNet rows exported does not mean all questions have known labels.',
            'Coarse parents can overlap across axes; do not subtract cluster count from original tag count.',
            'No forced labels for missing EdNet content. Preserve original IDs and unresolved state.']}
    write_json('own_taxonomy.json',result);write_json('own_tag_mappings.json',tag_mappings)
    write_json('part1_content_candidates.json',content);write_json('ednet_with_own_tags.json',questions)
    write_json('own_taxonomy_manifest.json',{'snapshot':snapshot,'input_sha256':manifest})
    write_csv('own_dictionary.csv',result['dictionary']);write_csv('own_tag_mappings.csv',tag_mappings)
    write_csv('ednet_with_own_tags.csv',questions);write_csv('own_coverage.csv',stats)
    write_csv('part1_group_stats.csv',group_stats);write_csv('own_pending_review.csv',pending)
    write_csv('part1_content_candidates.csv',content)
    lines=['# Bộ tag riêng — Part 1 và tái phủ EdNet','',
        'Trạng thái: proposal nghiên cứu, chưa chốt ngữ nghĩa.','',
        f"- {summary['own_content_tags']} nhãn nội dung/kỹ năng/định dạng riêng, {summary['own_attribute_tags']} mã thuộc tính tách riêng.",
        f"- Part 1: {summary['part1_tag_ids_with_content_mapping']} tag nguồn → {len(groups)} nhóm chủ đề rộng.",
        f"- Crawl Part 1: {len(content)} câu; {summary['part1_crawl_with_candidates']} có ứng viên, {summary['part1_crawl_unresolved']} chưa có.",
        f"- Câu EdNet Part 1 match ID: {summary['part1_question_id_matches']}. Không dùng câu Santa khác ID làm chứng minh nghĩa tag EdNet.",
        f"- Hàng chờ: {len(pending)} cặp tag/Part chưa có mapping nội dung; không bỏ hoặc ép gán.",'',
        '## Nhóm Part 1','']
    for g in group_stats:lines.append(f"- {g['name']}: tag {g['ednet_members']}; crawl ứng viên {g['crawl_candidate_questions']}/318; EdNet chiếu từ tag {g['ednet_projected_questions']}/643.")
    lines+=['','## Độ phủ toàn bộ EdNet','']
    for r in stats:lines.append(f"- {r['part']}: xuất {r['rows_exported']}/{r['total_questions']} dòng; {r['any_content_candidate']}/{r['total_questions']} có nhãn nội dung ứng viên; {r['all_original_tags_have_content_mapping']} câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.")
    lines+=['','## Quy tắc sử dụng','',
        'OWN IDs được hash từ trục và mã nhãn, không tái sử dụng numeric tag EdNet. Giữ scope từng thành viên và mọi tag gốc.',
        'Part 1 gộp sinh hoạt, mua sắm và công việc ở nhóm hoạt động để giảm độ chi tiết. Đây là parent thô, không đồng nghĩa kỹ năng con.',
        'Luật đọc đúng choice đã được nguồn đánh đáp án; không đọc distractor để tạo nhãn. Từ khóa chỉ là gợi ý text, chưa xem ảnh.',
        'Các câu ngoài luật có thể được assistant đọc text trong part1_text_reviews.json, khóa exact correct_text và rationale; không coi là người dùng duyệt hoặc independent gold.',
        'Các nhóm có thể đa nhãn. Tổng phần trăm không cần bằng 100%. Không coi mọi dòng export là đã hoàn thiện mapping.',
        'Muốn phủ đủ ngữ nghĩa cần tìm nội dung EdNet còn thiếu hoặc kiểm duyệt các bằng chứng khác. Không thể chứng minh nghĩa của tag chưa có neo chỉ bằng đồng xuất hiện.',
        'File own_pending_review.csv là danh sách công việc còn lại. Giữ trạng thái chưa hoàn tất thay vì báo bộ tag cuối cùng.','']
    (ROOT/'docs/OWN_TAGS.md').write_text('\n'.join(lines),encoding='utf-8')
    print(json.dumps(summary,ensure_ascii=False,indent=2))
    return result


if __name__=='__main__':build()
