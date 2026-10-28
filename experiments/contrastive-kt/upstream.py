"""Verify author's source, then apply three narrowly checked adapter patches."""
import hashlib
import types
from pathlib import Path

REPOSITORY = 'https://github.com/codingchild2424/cl_bert_kt'
COMMIT = '6d2006aeb4b93dae6948936c27d688fce3f60b00'
MODEL_SHA256 = '14bd1ada1a7a272935167f6361acc04c8b9fd8259b8721936021e1616c78968c'

def load_model(checkout):
    source = Path(checkout) / 'src/models/cl_monacobert.py'
    if hashlib.sha256(source.read_bytes()).hexdigest() != MODEL_SHA256:
        raise ValueError('Upstream model differs from the audited commit')
    text = source.read_text(encoding='utf-8')
    # Upstream get_device() returns -1 on CPU; .to(-1) fails. Change only
    # device selection, preserving all model equations and original file bytes.
    old = 'device = distcum_scores.get_device()'
    if text.count(old) != 1:
        raise ValueError('Unexpected CPU compatibility patch target')
    text = text.replace(old, 'device = distcum_scores.device')
    for branch, variable in [('c', 'i'), ('p', 'j')]:
        # Exact upstream spacing is checked below; no broad search/replace.
        old_pool = f'({branch}_z * mask.unsqueeze(-1)).sum(1) / mask.sum(-1).unsqueeze(-1)'
        new_pool = f'({branch}_z * mask_{variable}.unsqueeze(-1)).sum(1) / mask_{variable}.sum(-1).clamp(min=1).unsqueeze(-1)'
        if text.count(old_pool) != 1:
            raise ValueError('Unexpected augmentation pooling patch target')
        text = text.replace(old_pool, new_pool)
    module = types.ModuleType('audited_dcl4kt_model')
    exec(compile(text, str(source), 'exec'), module.__dict__)
    return module.CL_MonaCoBERT
