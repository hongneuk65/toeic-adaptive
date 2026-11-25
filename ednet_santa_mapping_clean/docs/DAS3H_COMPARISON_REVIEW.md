# Nhận xét đối chứng DAS3H đã xác minh

Dữ liệu thật: 413,744 lượt đã nộp của 3,000 người học; không cắt số lượt/người. Đây là cohort, không phải toàn bộ KT4.

- EdNet gốc, 188 tag: AUC trung bình 0.699760; log loss 0.590793.
- EdNet đổi nhãn OWN, 92 tag: AUC trung bình 0.695972; log loss 0.593015.
- Chênh AUC OWN − gốc: -0.003788 (chênh tuyệt đối, không phải phần trăm năng lực dự đoán giữ lại).

## Kết luận trong phạm vi lượt chạy này

OWN không cải thiện AUC trung bình so với tag gốc trong lượt chạy này. Không nên thay hẳn tag gốc chỉ vì bộ nhãn mới ít hơn.
Giảm số nhãn là một đánh đổi độ chi tiết, không đồng nghĩa tăng chất lượng. Hiệu năng dự đoán không kiểm định tên kỹ năng về ngữ nghĩa.
Dùng kết quả này làm baseline; muốn chốt taxonomy cần đánh giá xác nhận mới, protocol và tiêu chí chấp nhận đặt trước. Không chỉnh taxonomy theo test hiện tại rồi coi đây là holdout mới.

## Khoảng bất định theo seed

- Seed 42: delta -0.001299; 95% CI [-0.003954, +0.000352].
- Seed 43: delta -0.004382; 95% CI [-0.005816, -0.003043].
- Seed 44: delta -0.005682; 95% CI [-0.007753, -0.003804].

CI là paired bootstrap theo người học trong từng split. Các seed dùng cùng cohort, không độc lập hoàn toàn. CI chứa 0 không chứng minh tương đương.

## Kiểm chứng test thật

- Đọc lại và tái tạo đầy đủ log của 10 người từ ZIP; khớp bảng lượt làm dùng trong mô hình.
- Đối chiếu toàn bộ hàng test, timestamp, question ID và nhãn đúng/sai với cache trích xuất thực tế.
- Tính lại AUC/log loss/Brier/accuracy từ dự đoán cho toàn test, mapped/unmapped và cả 7 Part.
- Kiểm tra C được chọn bằng validation, các model được chọn hội tụ; hash code/mapping không đổi.
- Không sinh labels hoặc predictions giả lập. Logs/predictions cá nhân không nằm trong notebook public.

Tệp kiểm chứng máy đọc: outputs/das3h_comparison/verification.json.
