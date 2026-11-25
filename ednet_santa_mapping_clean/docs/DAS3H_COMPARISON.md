# DAS3H — EdNet gốc so với EdNet đổi nhãn OWN

Đã huấn luyện và test trên đáp án đúng/sai thật trong EdNet KT4. Không sinh số liệu mô phỏng.

- Cohort: 3000 người học; 413,744 lượt đã nộp; 11544 câu khác ID.
- Lấy toàn bộ lịch sử đã nộp của cohort, không giới hạn số lượt/người. Không phải toàn bộ người học KT4.
- Hai biến thể dùng chính xác cùng hàng dữ liệu và user splits. Test learner-disjoint, cập nhật lịch sử sau từng batch; không phải global calendar holdout.
- DAS3H d=0, sparse L2 logistic regression; không có latent interactions libFM. C chỉ chọn bằng validation.
- Giữ câu chưa có nhãn OWN trong cả hai biến thể; ở bản OWN những câu này vẫn có item bias nhưng không có skill features.

## AUC và log loss trên toàn bộ test

- ednet_original_188: AUC 0.699760 ± 0.004621; log loss 0.590793; Brier 0.202279.
- ednet_relabeled_own_92: AUC 0.695972 ± 0.006697; log loss 0.593015; Brier 0.203444.

± là SD giữa các split seed trên cùng cohort, không phải CI hay các fold độc lập.

## Chênh AUC OWN − gốc và CI bootstrap theo người học

- Seed 42, all_test: -0.001299; 95% CI [-0.003954, +0.000352].
- Seed 42, mapped_test: -0.000936; 95% CI [-0.003060, +0.000484].
- Seed 42, unmapped_test: -0.005884; 95% CI [-0.018423, +0.003157].
- Seed 43, all_test: -0.004382; 95% CI [-0.005816, -0.003043].
- Seed 43, mapped_test: -0.003288; 95% CI [-0.004643, -0.001862].
- Seed 43, unmapped_test: -0.019283; 95% CI [-0.027461, -0.013456].
- Seed 44, all_test: -0.005682; 95% CI [-0.007753, -0.003804].
- Seed 44, mapped_test: -0.004753; 95% CI [-0.006445, -0.003005].
- Seed 44, unmapped_test: -0.018738; 95% CI [-0.028810, -0.009666].

## Giới hạn và cách hiểu

- Tên tag/cluster chưa có gold ngữ nghĩa độc lập. AUC không xác nhận ý nghĩa tên tag.
- Hai mô hình khác cả độ chi tiết nhãn, accent và độ phủ skill. Đây là so sánh hai cách biểu diễn đã chọn, không phải hiệu ứng nhân quả riêng của clustering.
- Mapping đã khóa trước lượt chạy; không điều chỉnh taxonomy từ kết quả test.
- Full-history cohort không đồng nghĩa đã dùng toàn bộ 297.915 người học. Không tự gọi đây là full-EdNet benchmark.
- Log cá nhân, predictions và splits ở private/ bị Git ignore; chỉ báo cáo tổng hợp.
- Không dùng CI bao gồm 0 để kết luận hai mô hình tương đương. Chưa đặt equivalence margin.

Nguồn phương pháp: https://github.com/BenoitChoffin/das3h ; https://arxiv.org/abs/1905.06873
