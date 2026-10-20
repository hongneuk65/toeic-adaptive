"""Verify saved predictions and render an exportable scientific pilot report."""
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

from benchmark import metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    source, output = Path(args.input), Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    results = json.loads((source / 'results.json').read_text(encoding='utf-8'))
    predictions = np.load(source / 'test-predictions.npz')
    y = predictions['y']
    for name in ('DAS3H_d0_fitted', 'GRU', 'DAS3H_GRU_residual'):
        assert len(predictions[name]) == len(y) and np.isfinite(predictions[name]).all()
        checked = metrics(y, predictions[name])
        for key in ('auc', 'log_loss', 'brier'):
            assert abs(checked[key] - results['seed_mean_ensemble'][name][key]) < 1e-7
    for run in results['runs']:
        if 'seed' not in run:
            continue
        saved = np.load(source / f'{run["name"]}-seed{run["seed"]}-predictions.npz')['test']
        saved = saved[np.isfinite(saved)]
        assert len(saved) == len(y)
        checked = metrics(y, saved)
        for key in ('auc', 'log_loss', 'brier'):
            assert abs(checked[key] - run['test'][key]) < 1e-7
    names = ['DAS3H_d0_fitted', 'GRU', 'DAS3H_GRU_residual']
    labels = ['DAS3H (fitted)', 'GRU', 'DAS3H + GRU\n(residual)']
    plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 10,
                         'axes.spines.top': False, 'axes.spines.right': False})
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.8))
    for ax, metric, title in zip(axes, ('auc', 'log_loss'),
                                 ('ROC-AUC (higher is better)', 'Log loss (lower is better)')):
        for i, name in enumerate(names):
            runs = [r for r in results['runs'] if r['name'] == name]
            values = [r['test'][metric] for r in runs]
            avg, sd = np.mean(values), np.std(values)
            ax.errorbar(i, avg, yerr=sd, fmt='o', color='#23689b', capsize=5, markersize=7,
                        label='Mean +/- 1 SD across seeds' if i == 1 else None)
            ax.scatter(i + np.linspace(-.08, .08, len(values)), values, color='#606060', s=13,
                       zorder=3, label='Individual run' if i == 1 else None)
            ax.annotate(f'{avg:.4f}', (i, avg), xytext=(0, 13), textcoords='offset points', ha='center')
        ax.set_xticks(range(3), labels)
        ax.set_xlim(-.5, 2.5)
        ax.set_title(title, loc='left', pad=20)
        ax.set_ylabel('AUC (0 to 1)' if metric == 'auc' else 'Log loss (nats / answer)')
        ax.set_xlabel('Model')
        ax.grid(axis='y', alpha=.2)
        ax.margins(y=.3)
    axes[0].legend(loc='lower right', frameon=False, fontsize=8)
    m = results['manifest']
    fig.suptitle('EdNet-KT4: held-out answer prediction — pilot', x=.07, ha='left', fontsize=14)
    fig.text(.07, .03, f'Source: local EdNet-KT4 | {m["users"]:,} learners | {len(y):,} test answers | '
             'last ~15% of each learner\'s sampled bundles\n'
             'Neural: 3 seeds; DAS3H: one deterministic fit. Warm-start; feedback after bundle submission.', fontsize=8)
    fig.tight_layout(rect=(0, .12, 1, .91))
    fig.savefig(output / 'ednet-pilot-comparison.png', dpi=180)
    fig.savefig(output / 'ednet-pilot-comparison.pdf')
    plt.close(fig)

    summary_all = results['summary_single_runs']
    best_name = min(names, key=lambda name: summary_all[name]['log_loss']['mean'])
    best_label = labels[names.index(best_name)].replace('\n', ' ')
    d_auc = summary_all['DAS3H_GRU_residual']['auc']['mean'] - summary_all['DAS3H_d0_fitted']['auc']['mean']
    d_loss = summary_all['DAS3H_GRU_residual']['log_loss']['mean'] - summary_all['DAS3H_d0_fitted']['log_loss']['mean']
    lines = ['# Kết quả thử nghiệm DAS3H, GRU và kết hợp trên EdNet', '',
             'Ngày chạy: 17/10/2026. Đây là kết quả thực nghiệm trên mẫu EdNet thật, không phải số liệu từ bài báo.', '',
             '## Kết quả chính', '',
             f'- Mô hình có log loss test trung bình thấp nhất trong thiết lập này: **{best_label}**.',
             f'- Hybrid so với DAS3H: chênh AUC trung bình {d_auc:+.6f}; chênh log loss trung bình {d_loss:+.6f}.',
             '- Kết quả này chỉ áp dụng cho cấu hình và mẫu đã chạy; xem độ bất định và giới hạn bên dưới.', '',
             '## Dữ liệu và phương pháp', '',
             f'- {m["users"]:,} học viên; {m["bundles"]:,} nhóm câu đã nộp; {m["interactions"]:,} lượt trả lời.',
             f'- Train: {m["splits"]["train"]:,}; validation: {m["splits"]["validation"]:,}; test: {len(y):,}.',
             '- Chia theo thời gian trong từng học viên, giữ nguyên nhóm câu. Không đưa đáp án trong cùng nhóm vào dự đoán.',
             '- DAS3H học trọng số từ train; GRU và hybrid chạy seed 11/22/33. Chọn C/epoch bằng validation log loss.',
             '- Hybrid ở đây là DAS3H đã fit và đóng băng, cộng phần hiệu chỉnh logit do GRU học; không phải tái lập RKTM.',
             f'- Tỷ lệ đúng trên test: {np.mean(y):.2%}; luôn đoán đúng cho mọi câu đạt accuracy {np.mean(y):.2%}, AUC 0.5.',
             '', '## Kết quả từng mô hình', '']
    audit_path = source / 'data-audit.json'
    if audit_path.exists():
        audit = json.loads(audit_path.read_text(encoding='utf-8'))
        insert_at = lines.index('## Kết quả từng mô hình') - 1
        lines[insert_at:insert_at] = [
            f'- Test có {audit["test"]["oov_questions"]:,} lượt trả lời cho câu chưa xuất hiện trong train; '
            f'{audit["test"]["multi_skill_events"]:,} lượt có nhiều tag kỹ năng.',
            f'- Số lượt test theo Part: {audit["test"]["parts"]}. Mẫu thiên về Part 5, không cân bằng giữa các Part.', '']
    for name, label in zip(names, labels):
        summary = results['summary_single_runs'][name]
        lines += [f'### {label.replace(chr(10), " ")}', '']
        for metric, display in [('auc', 'ROC-AUC (cao hơn tốt hơn)'), ('log_loss', 'Log loss (thấp hơn tốt hơn)'),
                                ('brier', 'Brier (thấp hơn tốt hơn)'), ('accuracy_at_0.5', 'Accuracy, ngưỡng 0.5'),
                                ('ece_10_equal_width', 'ECE, 10 khoảng bằng nhau')]:
            entry = summary[metric]
            variability = (f'SD qua seed {entry["std"]:.6f}' if name != 'DAS3H_d0_fitted'
                           else 'một lần fit, không ước lượng SD giữa các lần huấn luyện')
            lines.append(f'- {display}: **{entry["mean"]:.6f}**; {variability}.')
        lines.append('')
        for run in results['runs']:
            if run['name'] != name:
                continue
            desc = f'seed {run["seed"]}, epoch được chọn {run["best_epoch"]}' if 'seed' in run else f'C được chọn {run["best_C"]}'
            lines.append(f'- {desc}: AUC {run["test"]["auc"]:.6f}, log loss {run["test"]["log_loss"]:.6f}, '
                         f'thời gian fit và đánh giá {run["seconds"]:.1f} giây.')
        lines.append('')
    lines += ['## Độ bất định', '',
              'Bootstrap ghép cặp theo học viên, 300 lần. Phần này dùng dự đoán trung bình của ba seed '
              '(ensemble), khác với trung bình metric từng lần chạy ở trên. Khoảng tin cậy chỉ phản ánh '
              'lấy mẫu học viên test, không bao gồm toàn bộ bất định huấn luyện.', '']
    for name, comparison in results['paired_bootstrap_seed_mean_ensemble'].items():
        a, b = comparison['delta_auc_ci95'], comparison['delta_log_loss_ci95']
        lines.append(f'- Hybrid trừ {name}: CI 95% chênh AUC [{a[0]:.6f}, {a[1]:.6f}]; '
                     f'chênh log loss [{b[0]:.6f}, {b[1]:.6f}].')
    lines += ['', 'AUC chênh dương có lợi cho hybrid; log loss chênh âm có lợi cho hybrid. '
              'Nếu khoảng chứa 0 thì chưa có bằng chứng rõ cho chênh lệch đó.', '',
              'Trong lượt chạy này, hybrid chỉ nhích AUC rất nhỏ so với DAS3H. CI AUC của ensemble '
              'nằm sát phía trên 0, còn CI log loss chứa 0; không nên đánh đồng nhích AUC này '
              'với một cải thiện hữu ích cho hệ thống. Log loss trung bình của các lần chạy riêng '
              'cũng chưa tốt hơn DAS3H.', '',
              '## Giới hạn và khả năng áp dụng', '',
              '- Chỉ lấy người có ít nhất 20 nhóm hợp lệ, giới hạn 200 nhóm đầu; chưa chạy toàn bộ EdNet.',
              '- Đánh giá học viên đã có lịch sử; chưa đánh giá cold start học viên mới hay chia theo ngày toàn hệ thống.',
              '- So sánh DAS3H được fit, không phải các theta mặc định của backend hiện tại.',
              '- Cấu hình mạng nhỏ, giới hạn 12 epoch trên CPU; chưa tối ưu siêu tham số với ngân sách ngang nhau.',
              '- Tag EdNet chưa được xác nhận tương đương danh mục kỹ năng trong ứng dụng.',
              '- Chưa đo tăng điểm TOEIC hoặc tác dụng của chính sách chọn câu. Không thay đổi production.', '',
              '## Kiểm chứng và tái lập', '',
              '- Đã đối chiếu lại metric từ các file dự đoán được lưu, kiểm tra đủ số lượng và không NaN.',
              '- Kiểm tra parser, ranh giới cửa sổ, tính nhân quả, padding và residual ban đầu bằng unit tests.',
              '- Mã chạy và lệnh tái lập: [README](../experiments/ednet/README.md).',
              '- Kết quả đầy đủ: `experiments/ednet/artifacts/pilot-2000/results.json`.',
              '- Checkpoint, dự đoán từng seed, manifest, danh sách mẫu và môi trường nằm cùng thư mục artifacts.',
              '- Nguồn dữ liệu và mô tả bundle: https://github.com/riiid/ednet .', '',
              '![So sánh mô hình](ednet-pilot-comparison.png)', '']
    (output / 'ednet-pilot-results.md').write_text('\n'.join(lines), encoding='utf-8')
    # Keep a small reviewable record in Git; large predictions/checkpoints remain ignored.
    (output / 'ednet-pilot-results.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
    for filename in ('environment.json', 'data-audit.json', 'source-provenance.json'):
        if (source / filename).exists():
            (output / f'ednet-pilot-{filename}').write_bytes((source / filename).read_bytes())
    print('Verified saved predictions; wrote PNG, PDF, Markdown and JSON report.')


if __name__ == '__main__':
    main()
