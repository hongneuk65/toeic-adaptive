# Thử DAS3H d > 0 (factorization machine), chỉ để nghiên cứu

Không tạo model.json, không đổi backend. Mô hình đang phục vụ vẫn là d = 0 (`experiments/das3h-production/artifacts/own-20261019`).

## Thiết lập

- Cùng dữ liệu và cách chia với `train.py`: 3.000 người (u3000_e0_s2026), chia theo người 70/15/15, hạt giống 42. Huấn luyện 281.250 lượt, xác thực 66.647, kiểm thử 65.847.
- Cùng ma trận đặc trưng (`encode_history`), 16.281 cột.
- Mô hình: z = b + w·x + Σ₍ᵢ<ⱼ₎⟨vᵢ, vⱼ⟩xᵢxⱼ, huấn luyện bằng Adam, phạt L2, dừng sớm theo log loss xác thực.
- Chọn cấu hình chỉ theo log loss xác thực. Với cấu hình đã chọn, chạy 3 hạt giống khởi tạo (0, 1, 2).
- So với d = 0 đang triển khai (liblinear, C = 1) bằng bootstrap ghép cặp theo 450 người kiểm thử, 1.000 lần. Δ = log loss(d=0) − log loss(d>0), dương là d > 0 tốt hơn.
- Tái lập d = 0 trong môi trường này cho AUC 0,703701 và log loss 0,579725, khớp báo cáo.
- Môi trường: Python 3, NumPy 2.5.3, SciPy 1.18.1, scikit-learn 1.9.1, pandas 3.0.5.

## Kết quả trên tập kiểm thử (trung bình 3 hạt giống)

**Cách A. Huấn luyện từ đầu, cùng một bộ tối ưu cho mọi d** (`results_scratch.json`)

| d | λ | AUC | Log loss | Brier | Vòng tốt nhất |
|---|---|---|---|---|---|
| 0 | 1e-6 | 0,6947 | 0,58344 | 0,19915 | 5–7 |
| 1 | 1e-5 | 0,6925 | 0,58524 | 0,19954 | 4–7 |
| 5 | 1e-5 | 0,6891 | 0,58850 | 0,20049 | 3–4 |
| 10 | 1e-5 | 0,6846 | 0,59393 | 0,20183 | 2–4 |
| 20 | 1e-5 | 0,6799 | 0,59706 | 0,20313 | 2–3 |

d càng lớn thì càng kém, và mô hình đạt tốt nhất ở vòng càng sớm, tức là quá khớp nhanh. Với d ≥ 5, khoảng tin cậy của Δ nằm hẳn dưới 0 ở cả 3 hạt giống (kém hơn d = 0 đang triển khai).

**Cách B. Bắt đầu từ đúng nghiệm d = 0 đang triển khai, chỉ thêm phần tương tác** (`results_warm.json`). Nếu phần tương tác không giúp thì mô hình giữ nguyên nghiệm d = 0.

| d | λ_V | AUC | Log loss | Δ log loss theo 3 hạt giống |
|---|---|---|---|---|
| 0 (triển khai) | | 0,7037 | 0,57973 | |
| 1 | 1e-4 | 0,7032 | 0,57994 | −0,00035 / −0,00028 / −0,00002 |
| 5 | 1e-2 | 0,7032 | 0,57982 | +0,00006 / −0,00017 / −0,00017 |
| 10 | 1e-4 | 0,7030 | 0,58006 | −0,00054 / −0,00010 / −0,00034 |
| 20 | 1e-3 | 0,7030 | 0,57993 | +0,00036 / −0,00058 / −0,00040 |

Log loss xác thực giảm nhẹ (0,58456 xuống 0,5830–0,5840), nhưng trên tập kiểm thử chênh lệch chỉ khoảng ±0,0006. Gần như mọi khoảng tin cậy đều chứa 0. Lần duy nhất khoảng tin cậy không chứa 0 (d = 10, hạt giống 0) lại nghiêng về phía d > 0 kém hơn. Không cấu hình nào cho AUC cao hơn d = 0.

## Kết luận

Trên cohort này, thêm tương tác bậc hai (d > 0) không cải thiện dự đoán trên tập kiểm thử. Huấn luyện từ đầu thì d càng lớn càng kém vì quá khớp. Kết quả ủng hộ giữ d = 0.

## Giới hạn

- FM huấn luyện bằng Adam và dừng sớm, không phải libFM MCMC như bài gốc.
- Chỉ có một lần chia dữ liệu và 3 hạt giống khởi tạo.
- Lưới d ∈ {1, 5, 10, 20}, λ trong 3–4 giá trị.

Chạy lại:

```
python fm_experiment.py --root <ednet_santa_mapping_clean> --out run1
python fm_experiment.py --root <ednet_santa_mapping_clean> --out run2 --warm --dims 1 5 10 20 --lambdas 1e-5 1e-4 1e-3 1e-2 --lr 0.001
```

Mỗi lần mất khoảng 4–5 phút trên 2 CPU, chưa tính bước mã hóa đặc trưng.

## Chẩn đoán vì sao d = 0 tốt nhất (`diag.py`, `diag.json`)

- Mỗi câu chỉ có trung vị 15 lượt trong tập huấn luyện, 31% số câu có dưới 10 lượt. d = 5 thêm 81.405 tham số, d = 20 thêm 325.620 tham số, trong khi tập huấn luyện có 281.250 lượt.
- 62% số lượt gắn đúng 1 kỹ năng, 7% không có kỹ năng nào, chỉ khoảng 28% có từ 2 kỹ năng. 17% lượt kiểm thử chưa có lịch sử.
- Chênh lệch log loss xác thực trừ huấn luyện (có one-hot người học): d = 0 là 0,020, còn d = 1, 5, 20 là 0,040 đến 0,046. Như vậy d > 0 khớp người học huấn luyện tốt hơn nhưng không chuyển sang được người học mới.
- Bỏ one-hot người học: chênh lệch giảm xuống 0,013 đến 0,029, nhưng log loss kiểm thử vẫn tăng dần theo d (0,5808; 0,5832; 0,5877; 0,5960). Tương tác với người học chỉ là một phần nguyên nhân.
