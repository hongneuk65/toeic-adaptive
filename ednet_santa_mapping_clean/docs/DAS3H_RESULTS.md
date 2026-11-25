# DAS3H pilot với bộ tag OWN

600 người học, 37,180 lượt làm đã nộp, 7855 câu khác ID.
Cùng lượt train/validation/test giữa mọi biến thể. Đánh giá online trên người học chưa có trong train, không phải global chronological holdout.

## AUC trung bình trên toàn bộ test

- item_only: AUC 0.633145 ± 0.014264; log loss 0.635721.
- original_ednet: AUC 0.630647 ± 0.014664; log loss 0.637995.
- own_content: AUC 0.624320 ± 0.020472; log loss 0.646481.
- own_with_fallback: AUC 0.629356 ± 0.019407; log loss 0.645616.

Độ lệch chuẩn giữa ba seed, không phải khoảng tin cậy. CI chênh AUC được bootstrap theo người học riêng từng seed trong paired_bootstrap.csv.

## Giới hạn

- Small prefix sample, three splits not independent folds.
- Mapping and clusters are research candidates, not independent gold.
- Prediction performance does not validate names of semantic skills.
- Unmapped OWN items retain item bias but have no skill history.
- Original and OWN differ in number and granularity of skills; no proof of causality or equivalence.
- Interactions and per-user predictions remain private local files; not published.

Mô hình là DAS3H d=0, không phải bản libFM latent chính thức. Cửa sổ 1h/1d/7d/30d/vô hạn; regularization chọn từ validation.
Nguồn phương pháp: https://github.com/BenoitChoffin/das3h ; https://arxiv.org/abs/1905.06873
