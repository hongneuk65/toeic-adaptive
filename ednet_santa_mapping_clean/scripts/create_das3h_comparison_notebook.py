"""Executed results-only notebook for the real 3000-learner comparison."""
from pathlib import Path
import sys
import nbformat as nbf
from nbclient import NotebookClient
from jupyter_client import KernelManager

ROOT=Path(__file__).resolve().parents[1]


def main():
    md=nbf.v4.new_markdown_cell;code=nbf.v4.new_code_cell
    nb=nbf.v4.new_notebook(cells=[
        md('# Test thật: EdNet gốc và cùng dữ liệu đổi nhãn OWN\n\nHai mô hình DAS3H d=0 huấn luyện trên log đúng/sai thật KT4. Cùng các lượt làm, đáp án, timestamp và splits. Không dùng dữ liệu Santa như lịch sử người học. Lịch sử cohort không bị cắt ở 200 attempts; đây vẫn là mẫu người học, không phải toàn KT4. Kết quả pilot ở notebook 02 được giữ riêng.'),
        code("from pathlib import Path\nimport json\nimport pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\nfrom IPython.display import display\nROOT=Path.cwd().resolve()\nif not (ROOT/'config/policy.json').exists(): ROOT=ROOT.parent\nOUT=ROOT/'outputs/das3h_comparison'\np=json.loads((OUT/'protocol.json').read_text(encoding='utf-8'))\nassert p['status']=='completed'\nm=pd.read_csv(OUT/'metrics.csv')\na=pd.read_csv(OUT/'aggregate_metrics.csv')\nci=pd.read_csv(OUT/'paired_bootstrap.csv')\nverification=json.loads((OUT/'verification.json').read_text(encoding='utf-8'))\nassert verification['passed']\nprint('Real learners:',p['sample']['learners'])\nprint('Real completed attempts:',p['sample']['attempts'])\nprint('Unique observed questions:',p['observed_questions'])\nprint('All history:',p['max_events_per_learner'] is None)\nprint('Mapping SHA256:',p['own_projection_sha256'])\nprint('Verification:',verification)\nprint('Rows by Part:',p['observed_parts'])"),
        md('## Protocol\n\n70/15/15 learner-disjoint, ba split seed trên cùng cohort. Cumulative wins/attempts trong 1h/1d/7d/30d/vô hạn, log1p, chỉ timestamp trước đó. Cùng submit không nhìn đáp án của nhau. C chọn theo validation log loss; test không chọn nhãn/ngưỡng/C. Không phải chronological split toàn cục hoặc question-disjoint test.'),
        code("display(m[['seed','variant','scope','auc','log_loss','brier','accuracy','train_attempts','validation_attempts','test_attempts','catalog_skills','train_observed_skills','C','converged']])\ndisplay(pd.read_csv(OUT/'validation_selection.csv'))"),
        md('## Đối chứng trực tiếp trên toàn bộ cùng lượt test\n\n188 tag EdNet so với 92 tag nội dung OWN. Không lọc bỏ câu chưa có OWN; câu đó vẫn giữ item bias nhưng không có skill history. Các numeric tag gốc bao gồm những thuộc tính được tách riêng ở OWN, nên đây không phải tác động riêng của clustering.'),
        code("top=a[a.scope=='all_test'].set_index('variant').loc[['ednet_original_188','ednet_relabeled_own_92']]\ndisplay(top)\nfig,axes=plt.subplots(1,2,figsize=(10,4.5))\nfor ax,metric in zip(axes,['auc','log_loss']):\n    ax.bar(['Original EdNet','Relabeled OWN'],top[metric+'_mean'],yerr=top[metric+'_std'].fillna(0),capsize=5,color=['#275d4b','#b79b68'])\n    ax.set(xlabel='Same EdNet event rows; only skill representation changes',ylabel=metric,title='Mean '+metric+' across 3 learner splits')\nfig.tight_layout();plt.show()\nfig.savefig(OUT/'original_vs_relabeled.png',dpi=150,bbox_inches='tight')"),
        md('## Bất định: paired bootstrap theo người học\n\nChênh AUC = OWN − gốc. CI riêng từng seed, không phải 3 fold độc lập. CI bao gồm 0 không chứng minh tương đương. Không đặt equivalence margin sau khi xem test.'),
        code("display(ci)\nsel=ci[ci.scope=='all_test'].reset_index(drop=True)\nfig,ax=plt.subplots(figsize=(9,3.5))\ny=np.arange(len(sel));ax.hlines(y,sel.ci95_low,sel.ci95_high,color='#275d4b');ax.scatter(sel.delta_auc_own_minus_original,y,color='#275d4b')\nax.axvline(0,color='#777777',linestyle='--')\nax.set(yticks=y,yticklabels=['seed '+str(s) for s in sel.seed],xlabel='AUC difference: OWN minus original (95% student-bootstrap CI)',title='Paired comparison on identical test events')\nfig.tight_layout();plt.show()\nfig.savefig(OUT/'paired_auc.png',dpi=150,bbox_inches='tight')"),
        md('## Phân rã theo Part và độ phủ nhãn\n\nCùng scope masks ở hai mô hình. Biến động ở Part ít lượt làm có thể lớn. Không lấy các Part thuận lợi để kết luận toàn mô hình.'),
        code("parts=a[a.scope.isin(['p'+str(i) for i in range(1,8)])]\ndisplay(parts[['variant','scope','auc_mean','auc_std','log_loss_mean']])\nwide=parts.pivot(index='scope',columns='variant',values='auc_mean')\nax=wide.plot.bar(figsize=(10,4),color=['#275d4b','#b79b68'])\nax.set(xlabel='TOEIC Part',ylabel='Mean AUC across learner split seeds',title='Same-row original versus relabeled comparison by Part')\nax.legend(title='Variant',loc='upper center',bbox_to_anchor=(.5,-.18));plt.tight_layout();plt.show()\nax.figure.savefig(OUT/'per_part_auc.png',dpi=150,bbox_inches='tight')\ndisplay(a[a.scope.isin(['mapped_test','unmapped_test'])])"),
        md('## Dùng kết quả thế nào?\n\nKiểm tra pipeline có dùng log thật và không rò nhãn là việc khác với xác nhận taxonomy. Các nhãn OWN vẫn là proposal. Muốn tuyên bố giảm tag không mất chất lượng cần protocol, margin và tập xác nhận độc lập được chốt trước. Không sửa mapping bằng test ở lượt này rồi báo như holdout mới.'),
        code("print((ROOT/'docs/DAS3H_COMPARISON.md').read_text(encoding='utf-8'))\nassert m.converged.all()\nfor (_,scope),group in m.groupby(['seed','scope']): assert group.test_attempts.nunique()==1\nprint('All selected models converged; exact row identity checked against local real attempt cache.')\nprint('Private predictions/splits/interaction data are not exported into notebook.')"),
    ],metadata={'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},'language_info':{'name':'python'}})
    client=NotebookClient(nb,timeout=180,startup_timeout=30,kernel_name='python3',resources={'metadata':{'path':str(ROOT)}})
    client.km=KernelManager(kernel_name='python3');client.km.kernel_spec.argv=[sys.executable,'-m','ipykernel_launcher','-f','{connection_file}']
    client.execute()
    if client.km is not None and client.km.has_kernel:client.km.shutdown_kernel(now=True)
    path=ROOT/'notebooks/03_ednet_original_vs_relabeled.ipynb';nbf.write(nb,path);print(path)


if __name__=='__main__':main()
