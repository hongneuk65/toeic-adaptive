# Kế hoạch luyện tập thích ứng v1

Nhánh `codex/adaptive-recommendation` bổ sung lớp chọn kỹ năng phía trên DAS3H hiện có. Truy cập trang `/recommendations`; API `/mastery/me` trả thêm `learningPlan`. Không cần migration, seed lại hoặc huấn luyện lại model.

## Hành vi

Gợi ý đã mở rộng vào từng thư viện lý thuyết/từ vựng/nghe/đọc; từ vựng có đường cong HLR. Xem [hợp đồng tích hợp và hướng nghiên cứu](integrated-learning.md). Lớp mới phối hợp nhiều nguồn bằng chứng, không tự nhập kết quả chưa có mapping vào DAS3H.

- Chỉ đề xuất kỹ năng có câu hỏi thuộc kho được bộ chọn adaptive chấp nhận. Truy vấn quan hệ được gom thành một lần, không đếm từng kỹ năng.
- Chưa có lượt luyện được xếp vào đánh giá ban đầu; xác suất model cao/thấp không được dùng để khẳng định người học đã biết hoặc yếu.
- Xếp hạng theo nhu cầu củng cố, thiếu bằng chứng và mức đến hạn ôn. Điểm ưu tiên không phải xác suất hay điểm TOEIC.
- Lịch ôn dự kiến là lần luyện gần nhất cộng 1 ngày khi xác suất dưới 0,65; 3 ngày khi từ 0,65 đến dưới 0,85; 7 ngày khi từ 0,85 trở lên. Tính theo 24 giờ, hiển thị ngày Việt Nam. Không nhân thêm decay vào xác suất DAS3H.
- Giữ ít nhất một bài đến hạn trong ba gợi ý đầu nếu có. Những mục còn lại giữ thứ tự điểm ưu tiên, hòa điểm theo ID kỹ năng. Đây là quy tắc cân bằng danh sách, nên điểm không nhất thiết giảm dần ở vị trí được dành cho ôn tập.
- Một số quan hệ kiến thức nền được khai báo theo mã kỹ năng trong policy. Chúng là giả thuyết chương trình học, chưa được thẩm định chuyên môn; chỉ giảm nhẹ ưu tiên và đưa ra nút luyện nền tảng, không khóa bài nâng cao.
- Liên kết lý thuyết phải khớp kỹ năng và qua kiểm tra chủ đề từ tiêu đề, tránh một số gán nhãn legacy quá rộng. Không tìm thấy bài phù hợp thì không hiển thị liên kết.
- Sau khi ghi nhận câu trả lời qua luồng giao dịch hiện có, tải lại hồ sơ để tính lại kế hoạch. Không thêm bảng lịch ôn hoặc một lần ghi trạng thái có thể lệch khỏi lịch sử học.
- Tránh lặp 20 câu gần nhất trên toàn bộ kỹ năng (lấy tối đa 100 hàng lịch sử để gom câu đa kỹ năng). Khi kho nhỏ đã dùng hết, chọn câu ít gần đây nhất trong tập đó. Đây là cửa sổ hữu hạn, không phải toàn bộ lịch sử.

## Phạm vi và cơ sở

Tham khảo cách tách lớp KT và recommendation có ràng buộc của [PLRS](https://clementina-tom.github.io/projects/index.html), cùng định hướng hỗ trợ học từ [OATutor](https://github.com/CAHLR/OATutor). Phần triển khai dùng policy riêng trong TypeScript, không tích hợp thư viện hay trọng số của các repo này.

Lịch 1/3/7 ngày và các trọng số là heuristic minh bạch, không phải SM-2 hay mô hình quên đã được fit. Chưa có kết quả thử nghiệm chứng minh tăng điểm TOEIC. Nhánh đã bổ sung [hướng dẫn củng cố từng bước](adaptive-practice-support.md), [đối chứng pyBKT/pyKT DKT](../experiments/kt-benchmark/README.md) trên cohort thật và [sinh câu hỏi Reading có truy vết nguồn](reading-source-generation.md). RL/ExRec vẫn cần thí nghiệm và hợp đồng dữ liệu riêng trước khi gộp vào hệ thống.

## Kiểm tra

Phần [ExRec sandbox](../experiments/exrec-sandbox/README.md) đã có bộ lập kế hoạch BKT hai bước và so sánh mô phỏng 27 cấu hình. Đây là thực nghiệm riêng, chưa phải ExRec MVE hay RL phục vụ người học; không thay policy đang chạy.

- `npm run check` từ gốc: lint, toàn bộ unit tests và build cả hai ứng dụng.
- `npm run test:browser --prefix frontend -- learning-plan.spec.ts recommendation-topics.spec.ts`: desktop/mobile; lý do, ngày ôn, nền tảng, liên kết, trạng thái trống, giữ phiên học khi refresh và luồng chủ đề cũ.
- `node test/recommendation-smoke.cjs` từ backend sau build: đọc PostgreSQL local và mở câu hỏi cho ba mục đầu; không ghi dữ liệu người học, không in danh tính.

Các browser tests dùng API giả lập; smoke đọc database thật bổ sung kiểm tra truy vấn và tương thích dữ liệu. Chúng không thay thế đánh giá tiến bộ học tập trên người học thật.

### Kết quả ngày 22/10/2026

- Kiểm tra toàn dự án đạt: lint, 57 suites / 282 backend tests, 65 frontend tests và build hai ứng dụng.
- Sau review độc lập, sửa chọn nhầm lý thuyết legacy và việc cold start lấn hết lượt ôn; thêm hai ca hồi quy. Chạy lại 23/23 tests liên quan, build backend, lint backend đạt.
- 8/8 browser cases desktop/mobile đạt; đã xem ảnh mobile để kiểm tra bố cục và khả năng đọc.
- Smoke PostgreSQL chỉ đọc đạt với 42 kỹ năng trong hồ sơ, 35 kỹ năng có kho câu hỏi và ba đề xuất đầu mở câu thành công; không lộ đáp án trước khi trả lời.
- Review độc lập xác nhận không còn major/blocker trong phạm vi thay đổi. Các vai trò reviewer cấu hình riêng không có trong phiên; dùng agent review tập trung backend, React và accessibility thay thế.
- Cảnh báo chunk Three.js trên 500 kB có từ trước vẫn còn. Chưa push hoặc triển khai lên production.
