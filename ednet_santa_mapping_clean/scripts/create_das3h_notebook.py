"""Build and execute the results-only DAS3H notebook, without rerunning training."""
import sys
from pathlib import Path
import nbformat as nbf
from nbclient import NotebookClient
from jupyter_client import KernelManager

ROOT=Path(__file__).resolve().parents[1]


def main():
    md=nbf.v4.new_markdown_cell;code=nbf.v4.new_code_cell
    nb=nbf.v4.new_notebook(cells=[
        md('# DAS3H d=0 — thử bộ tag riêng OWN\n\nPilot dự đoán đúng/sai, không kiểm định ý nghĩa tên tag. Mọi biến thể dùng cùng người học và cùng lượt train/validation/test. Chỉ có nhãn đúng/sai từ EdNet KT4, không dùng câu trả lời tài khoản Santa.\n\nTham khảo: [DAS3H tác giả](https://github.com/BenoitChoffin/das3h), [paper](https://arxiv.org/abs/1905.06873).'),
        code("from pathlib import Path\nimport json\nimport pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt\nfrom IPython.display import display\nROOT = Path.cwd().resolve()\nif not (ROOT/'config/policy.json').exists(): ROOT=ROOT.parent\nOUT=ROOT/'outputs/das3h'\nprotocol=json.loads((OUT/'protocol.json').read_text(encoding='utf-8'))\nmetrics=pd.read_csv(OUT/'metrics.csv')\nagg=pd.read_csv(OUT/'aggregate_metrics.csv')\nci=pd.read_csv(OUT/'paired_bootstrap.csv')\nprint('Mapping SHA256:',protocol['mapping_sha256'])\nprint('Learners:',protocol['attempt_sample']['learners'])\nprint('Completed attempts:',protocol['attempt_sample']['attempts'])\nprint('Distinct observed questions:',protocol['sample_observed_questions'])\nprint(protocol['split'])"),
        md('## 1. So sánh gì?\n\n- original_ednet: numeric tags nguồn, đổi thành mã feature.\n- own_content: chỉ nhãn nội dung/kỹ năng/định dạng riêng; câu chưa có nhãn vẫn giữ item bias.\n- own_with_fallback: OWN cộng tag EdNet dự phòng cho các tag/Part chưa được mapping nội dung.\n- item_only: user/item biases, không có lịch sử kỹ năng.\n\nCùng corpus và toàn bộ lịch sử quan sát; không xóa lượt làm khi một câu thiếu OWN. Không dùng accent làm kỹ năng.'),
        code("display(metrics[['seed','variant','scope','auc','log_loss','brier','test_attempts','catalog_skills','train_observed_skills','features','C','converged']])\ndisplay(pd.read_csv(OUT/'validation_selection.csv'))"),
        md('## 2. AUC và log loss trên cùng toàn bộ test\n\nThanh sai số là độ lệch chuẩn giữa ba split seed, không phải CI. Các split dùng lại một cohort, không phải ba mẫu độc lập. AUC cao hơn tốt hơn; log loss thấp hơn tốt hơn.'),
        code("data=agg[agg.scope=='all_test'].set_index('variant').loc[['original_ednet','own_content','own_with_fallback','item_only']]\nfig,axes=plt.subplots(1,2,figsize=(12,4.5))\nx=np.arange(len(data))\nfor ax,metric,title in [(axes[0],'auc','Discrimination on identical test rows'),(axes[1],'log_loss','Log loss on identical test rows')]:\n    ax.bar(x,data[metric+'_mean'],yerr=data[metric+'_std'].fillna(0),capsize=4,color=['#275d4b','#477d69','#b79b68','#8c9692'])\n    ax.set(xticks=x,xticklabels=data.index,ylabel=metric,title=title,xlabel='Tag variant')\n    ax.tick_params(axis='x',labelrotation=30)\nfig.tight_layout();plt.show()\nfig.savefig(OUT/'comparison.png',dpi=150,bbox_inches='tight')\ndisplay(data)"),
        md('## 3. Chênh AUC và bất định\n\nPaired bootstrap theo người học trên cùng test rows, 200 lần/seed. CI chỉ phản ánh biến thiên cohort test ở split đó; không có kiểm định tương đương hoặc điều chỉnh multiple comparisons.'),
        code("display(ci)\nfig,ax=plt.subplots(figsize=(10,5))\nlabels=[f\"seed {r.seed}: {r.comparison}\" for r in ci.itertuples()]\ny=np.arange(len(ci))\nax.hlines(y,ci.ci95_low,ci.ci95_high,color='#275d4b')\nax.scatter(ci.delta_auc,y,color='#275d4b')\nax.axvline(0,color='#888888',linestyle='--')\nax.set(yticks=y,yticklabels=labels,xlabel='AUC difference versus original EdNet',title='Paired student-bootstrap 95% intervals')\nfig.tight_layout();plt.show()\nfig.savefig(OUT/'paired_auc.png',dpi=150,bbox_inches='tight')"),
        md('## 4. Câu có mapping và câu chưa có mapping\n\nCác scope dùng cùng row masks giữa mọi model. Kết quả ở nhóm nhỏ có thể không ổn định. Không chọn kết quả test thuận lợi để thay đổi taxonomy rồi báo lại như holdout.'),
        code("display(agg.sort_values(['scope','variant']))\nassert metrics.converged.all()\nfor (_,scope),g in metrics.groupby(['seed','scope']):\n    assert g.test_attempts.nunique()==1,'Variant row counts differ'\nprint('Selected models converged; test row counts equal across all variants.')\nprint('Interaction data, individual predictions, and user splits remain ignored local files.')"),
        md('## 5. Chưa thể kết luận gì?\n\nPilot 600 người, prefix khoảng 200 attempts không đại diện toàn EdNet. Không chứng minh tên kỹ năng đúng, nhóm tối ưu, hoặc mô hình tương đương. Dùng thêm người/lịch sử dài hơn và protocol cố định trước khi chốt luận văn. Student-disjoint evaluation không phải global calendar holdout; test learner responses chỉ cập nhật lịch sử sau khi dự đoán từng batch. DAS3H d=0 ở đây không có latent interactions libFM.'),
        code("for note in protocol['limits']: print('-',note)\nprint((ROOT/'docs/DAS3H_RESULTS.md').read_text(encoding='utf-8'))"),
    ],metadata={'kernelspec':{'display_name':'Python 3','language':'python','name':'python3'},'language_info':{'name':'python'}})
    client=NotebookClient(nb,timeout=180,startup_timeout=30,kernel_name='python3',resources={'metadata':{'path':str(ROOT)}})
    client.km=KernelManager(kernel_name='python3');client.km.kernel_spec.argv=[sys.executable,'-m','ipykernel_launcher','-f','{connection_file}']
    client.execute()
    if client.km is not None and client.km.has_kernel:client.km.shutdown_kernel(now=True)
    path=ROOT/'notebooks/02_das3h_pilot.ipynb';nbf.write(nb,path);print(path)


if __name__=='__main__':main()
