# Khả năng kết hợp DAS3H và GRU trong TOEIC Adaptive

Ngày khảo sát: 16/10/2026. Phạm vi: mã nguồn hiện tại và tài liệu nghiên cứu bên dưới; chưa khảo sát dữ liệu production, chưa huấn luyện mô hình hybrid.

## 1. Kết luận và mức bằng chứng

- **Đã xác minh trong repo:** hệ thống có một biến thể lấy cảm hứng từ DAS3H. Không tìm thấy triển khai GRU, checkpoint hay pipeline train GRU trong mã nguồn được khảo sát.
- **Có tiền lệ nghiên cứu:** RKTM kết hợp mã hóa KTM/DAS3H với trạng thái kiến thức tuần tự; Option Tracing có Bi-LSTM+DAS3H. Đây là bằng chứng cho hướng ghép đặc trưng lịch sử với mạng hồi quy, không phải bằng chứng rằng chính DAS3H+GRU đã hiệu quả trên TOEIC.
- **Suy luận thiết kế:** có thể dùng GRU một chiều để mã hóa chuỗi tương tác và ghép với đặc trưng thời gian DAS3H tại đầu dự đoán. Cần kiểm nghiệm trên dữ liệu phù hợp trước khi sử dụng để chọn câu hỏi.
- **Chưa được chứng minh:** hybrid tốt hơn DAS3H được huấn luyện, cải thiện mastery thực, tăng điểm TOEIC, hoặc tối ưu lịch ôn.

## 2. Những gì hệ thống đang thực hiện

Đối chiếu `backend/src/das3h/das3h.service.ts`:

- `predictProbCorrect`: sigmoid của ability trừ difficulty cộng trung bình đóng góp của các skill.
- `calculateHTheta`: đếm đúng/sai theo 5 khoảng rời nhau [0,1), [1,7), [7,30), [30,90), [90,180) ngày, rồi cộng theta nhân log(1+count).
- `updateAbilityOnline`: chỉ cập nhật ability với bước 0.03 và clip [-3.5,3.5]. Đây không phải huấn luyện đầy đủ các tham số DAS3H.
- `DEFAULT_THETA` và `backend/prisma/seed-weights.ts` dùng các số đặt sẵn. Không tìm thấy pipeline fit theta trong repo; DB thực tế có thể đã được cập nhật ngoài repo nên không suy ra giá trị DB từ seed.
- `getSkillMastery`: sigmoid(ability + easiness + history), không có độ khó câu hỏi. Đây là chỉ số do ứng dụng định nghĩa, chưa có bằng chứng là mastery đã hiệu chuẩn.
- `syncRecord` dự đoán/cập nhật ability trước khi ghi đáp án vào lịch sử; transaction khóa theo user và có chống lặp job.

`backend/src/das3h/adaptive-scheduler.service.ts` chọn trong tối đa 50 câu, tránh 20 lịch sử gần đây, ưu tiên xác suất gần 0.75 và exploration 0.15. Các con số này là cấu hình của ứng dụng, không phải kết quả tối ưu đã được chứng minh. Đường batch `evaluateCandidatesForSkill` chỉ tính skill đích; khác đường `predictProbCorrect` dùng tất cả skill của câu. Khi ghép hybrid phải thống nhất hai đường này.

`backend/src/exam/exam.service.ts` chấm server và enqueue các câu có chọn đáp án; câu bỏ trống không trở thành quan sát mastery. Worker trong `backend/src/queue/mastery.processor.ts` hiện chỉ gọi DAS3H. Các module luyện Reading/Listening riêng chưa cập nhật DAS3H theo tài liệu và các luồng hiện có; không đồng nhất chúng với các câu Reading/Listening của bài thi thử.

## 3. Đối chiếu nghiên cứu thật

### DAS3H — Choffin, Popineau, Bourda, Vie (2019)

Nguồn: https://arxiv.org/html/1905.06873, mục 4 và 5.1.

Bản d=0 dùng logistic regression, cộng đóng góp nhiều kỹ năng, đặc trưng log số đúng và tổng lượt thử trong cửa sổ thời gian mở rộng chồng nhau. Các mốc là 1 giờ, 1 ngày, 7 ngày, 30 ngày và toàn bộ lịch sử. Tác giả fit tham số từ dữ liệu. Vì vậy bản repo dùng khoảng rời, đúng/sai, trung bình skill và theta mặc định phải được gọi là biến thể, không được trình bày là tái lập nguyên bản. Không có căn cứ từ bài này để gọi các theta seed là đường cong Ebbinghaus đã được hiệu chuẩn.

### Deep Knowledge Tracing — Piech và cộng sự (2015)

Nguồn: https://papers.nips.cc/paper_files/paper/2015/file/bac9162b47c56fc8a4d2a519803d51b3-Paper.pdf

Bài gốc khảo sát RNN thường và LSTM cho chuỗi tương tác học tập. Không được dẫn bài này như một thực nghiệm DAS3H+GRU.

GRU có nền tảng riêng từ Cho và cộng sự (2014): https://aclanthology.org/D14-1179/ . Việc chọn GRU thay LSTM trong đề xuất bên dưới là lựa chọn kỹ thuật cần đánh giá.

### RKTM — Lai, Wang, Ling (2021), Expert Systems 38(8), e12782

Nguồn nhà xuất bản: https://onlinelibrary.wiley.com/doi/10.1111/exsy.12782

Abstract xác nhận mô hình mở rộng mã hóa KTM và DAS3H bằng trạng thái kiến thức, với hai thành phần tracing và predicting. Đây là tiền lệ sát câu hỏi. Phần nội dung truy cập được chưa đủ để xác nhận chi tiết cell GRU; báo cáo này không gán GRU cho RKTM hay tự nhận đề xuất là tái lập RKTM.

### Option Tracing: Beyond Binary Knowledge Tracing — Ghosh và Lan (2020)

Nguồn bản thảo: https://dqanonymousdata.blob.core.windows.net/neurips-public/papers/arigosh/task_1_2_edu_neurips_ghosh_lan.pdf

Mục 3 ghép đặc trưng DAS3H-like vào đầu ra Bi-LSTM. Bối cảnh challenge cho phép quan sát một số đáp án tương lai và dùng cả bộ đếm tương lai. Do đó chỉ tham khảo nguyên lý fusion; hệ thống online phải bỏ toàn bộ nhánh tương lai, không tái sử dụng kết quả benchmark làm bằng chứng cho dự đoán next-question TOEIC.

### Gervet và cộng sự (2020), When is Deep Learning the Best Approach to Knowledge Tracing?

Nguồn tác giả: https://theophilegervet.github.io/assets/pdf/gervet2020deep.pdf, mục 6–7.

Nghiên cứu so sánh cho thấy lợi thế deep learning phụ thuộc dữ liệu; mô hình phi tuyến khai thác đặc trưng cửa sổ tốt hơn trong một số tập. Điều này ủng hộ thử nghiệm hybrid nhưng không bảo đảm GRU thắng. Không lấy một ngưỡng số mẫu trong nghiên cứu làm yêu cầu phổ quát cho hệ thống này.

## 4. Kiến trúc đề xuất cho hệ thống — giả thuyết cần kiểm nghiệm

Ưu tiên một mô hình **GRU kết hợp đặc trưng lịch sử kiểu DAS3H** tại đầu dự đoán. Tên này chính xác hơn việc mặc nhiên gọi một mạng bất kỳ là DAS3H nguyên bản.

Với sự kiện t, câu q_t, tập kỹ năng K_t, đáp án y_t và thời điểm tau_t:

1. `h_(t-1)` chỉ tóm tắt các tương tác đã biết đáp án trước t.
2. Tính `phi_t(q_t)` từ lịch sử trước t: log(1+số đúng), log(1+tổng lượt thử) theo cửa sổ và skill; có thể thêm khoảng cách từ lần luyện skill gần nhất. Gộp skill có mask để hỗ trợ nhiều kỹ năng. Mean pooling là phương án thử, không phải giả định rằng skill yếu luôn được bù bởi skill mạnh.
3. `p_t = sigmoid(MLP(concat(h_(t-1), item_embedding(q_t), pooled_skill_embedding(K_t), phi_t(q_t), difficulty(q_t))))`.
4. Chỉ sau khi y_t đã được chấm: `h_t = GRU(concat(item_embedding(q_t), pooled_skill_embedding(K_t), y_t, log1p(delta_time)), h_(t-1))`.
5. Train bằng binary cross entropy với masking padding. Tham số, kích thước hidden, dropout và chiều dài chuỗi chọn bằng validation; không có một cấu hình tối ưu được chứng minh trước.

Điểm bổ sung có thể có: bộ đếm giữ thông tin lịch sử nhiều thang thời gian; GRU học thứ tự và quan hệ giữa tương tác. GRU thông thường không tự biết đã trôi qua bao lâu nếu không được cấp thời gian. Sau kỳ nghỉ, phải tính lại phi theo thời điểm truy vấn, kể cả khi hidden state chưa đổi.

Một đối chứng khác là residual: `p = sigmoid(z_DAS3H + g(h, q, K))`. Phải đóng băng hoặc quản lý rõ baseline, regularize nhánh residual và train; không cộng hai xác suất tùy tiện. Đề xuất này cũng chưa được chứng minh tốt hơn feature fusion.

## 5. Dữ liệu cần sửa trước khi train

- `StudentSkillHistory` là một hàng cho mỗi skill, không phải một hàng cho mỗi lượt làm câu. Không đưa từng hàng vào GRU như các lần làm độc lập. Cũng không deduplicate đơn giản theo user+question, vì học viên có thể làm lại cùng câu.
- Thêm sự kiện chuẩn `LearningInteraction`: eventId, userId, questionId, skillIds, isCorrect, source, sourceAttemptId, occurredAt, observedAt, sequenceNumber; thời gian làm chỉ thêm nếu thực sự đo được. Version hóa ánh xạ skill/độ khó để tránh metadata tương lai thay đổi quá khứ.
- Payload queue hiện thiếu thời điểm xảy ra và thứ tự. `createdAt` của skill history là lúc ghi trong worker, có thể khác lúc học. Bài thi lưu đáp án khi nộp, không đo thứ tự và thời điểm từng câu đã thực sự được trả lời. Không dựng lại thứ tự thật từ các timestamp này.
- Khóa transaction theo user bảo đảm cập nhật tuần tự, không tự bảo đảm đúng thứ tự thời gian học khi có retry/job đến trễ. Cần event ordering, idempotency theo eventId và khả năng replay.
- Với bài thi chưa trả đáp án từng câu, không để y của câu trong cùng bài thi đi vào trạng thái dùng dự đoán những câu còn lại trước lúc nộp. Tách đánh giá luyện có feedback và bài thi dạng batch; dữ liệu lịch sử thiếu thứ tự nên được xử lý theo batch hoặc loại khỏi thí nghiệm chuỗi chính và báo cáo tỷ lệ loại.
- Queue hiện bắt/log lỗi enqueue; cần outbox hoặc cơ chế phục hồi sự kiện trước khi dựa vào hidden state production.

## 6. Tích hợp vào NestJS sau khi kiểm nghiệm

Tạo abstraction `KnowledgeTracingPredictor` với predict một câu, batch candidates và observe sự kiện; giữ scheduler là nơi áp dụng chính sách chọn câu. Huấn luyện offline, phục vụ qua service Python hoặc runtime tương thích đã benchmark. Đây là phương án kiến trúc, repo hiện chưa có thành phần này.

Chạy shadow trước: log modelVersion, featureVersion, event cutoff, p_DAS3H, p_GRU và p_hybrid trên cùng ứng viên; chưa thay lựa chọn của học viên. Batch phải dùng cùng trạng thái trước câu trả lời và đầy đủ skill của từng candidate. Chỉ observe câu thực sự được trả lời, không cập nhật trạng thái cho các câu chỉ được chấm điểm ứng viên.

Cache hidden state theo user+modelVersion+lastEventId; trạng thái không tương thích phải replay, không sử dụng lại khi đổi trọng số. Với lỗi inference hoặc cold start, dùng baseline được định nghĩa rõ. Không cập nhật trọng số mạng theo từng request như cập nhật ability hiện tại nếu chưa thiết kế quy trình online learning.

Giữ `UserSkillMastery` riêng trong giai đoạn thử nghiệm: xác suất trả lời đúng một câu và hidden vector không tự động là mastery từng skill. Muốn thay mastery cần định nghĩa phép đo và kiểm chứng riêng.

## 7. Thiết kế thực nghiệm để kết luận có nên kết hợp

So sánh trên cùng dữ liệu và cùng thông tin khả dụng: (A) code heuristic hiện tại; (B) DAS3H nguyên bản d=0 được fit; (C) GRU thuần có cùng item/skill/time cơ bản; (D) GRU+đặc trưng DAS3H; (E) MLP+đặc trưng DAS3H để kiểm tra lợi ích có thực sự do chuỗi; có thể thêm residual.

Chia train/validation/test theo thời gian, giữ nguyên prefix hợp lệ của mỗi học viên; bổ sung test học viên mới và câu mới. Fit vocabulary, scaler, difficulty và các tham số chỉ trên train. Khi replay test có thể cập nhật trạng thái bằng đáp án đã được tiết lộ ở bước trước, nhưng không cập nhật trọng số hoặc chọn cấu hình bằng nhãn test.

Báo cáo ROC-AUC, log loss, Brier/calibration, nhiều seed và bootstrap theo học viên; tách nhóm cold start, skill hiếm, nhiều skill, câu chưa thấy và nghỉ dài. Ablation bỏ cửa sổ, bỏ delta-time và bỏ recurrence giúp xác định nguồn cải thiện. Kiểm tra latency batch 50 câu và tính nhất quán giữa single/batch.

Chỉ cân nhắc triển khai nếu hybrid cải thiện ổn định so với baseline được fit, xác suất đủ hiệu chuẩn cho chính sách 0.75, và đáp ứng ngân sách độ trễ đặt trước. AUC tốt hơn chưa chứng minh lịch học tốt hơn; muốn kết luận tăng khả năng nhớ hoặc điểm TOEIC cần đánh giá học tập riêng với nhóm đối chứng và bài kiểm tra độc lập.

## 8. Phạm vi kiểm chứng của lượt khảo sát

Đã đọc service, scheduler, schema, seed, luồng exam và queue; tìm kiếm GRU/runtime/checkpoint và pipeline theta trong repo. Unit test hiện có kiểm tra hành vi ghi sự kiện và queue, không phải bằng chứng độ chính xác dự báo. Chưa train, chưa benchmark dữ liệu thật, chưa khẳng định hybrid tốt hơn.

## 9. Cập nhật ngày 17/10/2026

Sau khảo sát ban đầu, đã bổ sung thí nghiệm offline riêng trong `experiments/ednet/`: DAS3H d=0 được fit, GRU và hybrid residual trên cùng mẫu EdNet-KT4. Thuật toán production chưa thay đổi. Xem [kết quả thực nghiệm và giới hạn](ednet-pilot-results.md), cùng [protocol và lệnh tái lập](../experiments/ednet/README.md). Các phát biểu “chưa train” ở trên mô tả trạng thái ngày khảo sát 16/10, không phải trạng thái sau thí nghiệm này.
