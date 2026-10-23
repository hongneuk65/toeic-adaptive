# Hướng dẫn củng cố sau câu trả lời sai

Triển khai trên nhánh `codex/adaptive-recommendation`, tiếp nối kế hoạch học theo DAS3H. Không cần migration, seed lại dữ liệu, model mới hay khóa API AI.

## Luồng sử dụng

1. Mở một kỹ năng từ trang Gợi ý học tiếp và trả lời câu hỏi.
2. Sau khi server lưu một câu trả lời chưa đúng, chọn **Hướng dẫn từng bước**.
3. Đọc từng bước, chọn **Bước tiếp theo** để mở thêm. Hướng dẫn là cách tiếp cận cho kỹ năng, không khẳng định nguyên nhân sai ở câu cụ thể.
4. Có thể mở bài lý thuyết phù hợp hoặc chọn **Luyện thêm kỹ năng này**. Thao tác này giữ nguyên kỹ năng thay vì chuyển sang kỹ năng kế tiếp của chủ đề; câu mới vẫn do bộ chọn DAS3H hiện có quyết định.
5. Khi đổi câu, hướng dẫn và mã lượt luyện được đặt lại. Trả lời đúng vẫn dùng luồng chuyển câu bình thường.

Các chiến lược được biên soạn cho 12 nhóm chủ đề và bao phủ 40 mã kỹ năng trong seed; hòa hợp chủ vị có hướng dẫn riêng. Mã chưa biết dùng hướng dẫn chung có giới hạn. Đây là nội dung hướng dẫn theo kỹ năng, không phải lời giải riêng từng câu; lời giải lưu sẵn và chức năng RAG vẫn được giữ lại. Chưa có thẩm định độc lập của giáo viên cho toàn bộ nội dung này.

## Hợp đồng và tính nhất quán

`POST /das3h/practice-support` nhận `{ questionId, skillId, attemptId }`. Dùng JWT và quyền USER như các API luyện tập khác. DTO yêu cầu ID dương và attemptId UUID.

- Chỉ đọc lượt adaptive đã lưu của chính người dùng và đúng câu hỏi.
- Kiểm tra hash của lượt trả lời để bảo đảm kỹ năng là kỹ năng ban đầu, kể cả câu hỏi gắn nhiều kỹ năng.
- Chỉ cho mở khi kết quả lưu là `isCorrect: false`; không dựa vào cờ đúng/sai do client cung cấp.
- Tôn trọng ranh giới bài thi đang làm theo chính sách truy cập đáp án hiện có.
- Nếu câu hỏi bị xóa hoặc bỏ liên kết kỹ năng, trả lỗi rõ ràng thay vì đưa hướng dẫn không còn phù hợp.
- Bài lý thuyết phải khớp kỹ năng và chủ đề sau hiệu chỉnh tiêu đề legacy; không có bài phù hợp thì không đưa liên kết.
- API không trả đáp án, không đọc khóa đáp án trong truy vấn câu hỏi và không ghi observation/mastery. Retry không làm tăng lượt luyện.

Giao diện chỉ tải hướng dẫn khi người dùng yêu cầu, có trạng thái đang tải/lỗi/thử lại, hiển thị từng bước và giữ phạm vi bàn phím trong hộp luyện tập. Lỗi hướng dẫn không cản xem lời giải hoặc luyện tiếp.

## Kiểm tra

- Unit: `npm test --prefix backend -- --runInBand --ci practice-support`.
- Toàn dự án: `npm run check`.
- Trình duyệt: `npm run test:browser --prefix frontend -- practice-support.spec.ts learning-plan.spec.ts recommendation-topics.spec.ts`.
- PostgreSQL thật, schema tạm riêng tự dọn: sau build backend, chạy `node test/learning.integration.cjs` từ backend. Có ca trả lời sai thật qua DAS3H, mở hỗ trợ nhiều lần, replay câu trả lời không tăng observation, chặn người khác/kỹ năng khác/câu đúng và bài thi đang mở.

Browser tests dùng API mô phỏng; kiểm thử PostgreSQL bổ sung bằng chứng về truy vấn và giao dịch thật. Các kiểm tra này không chứng minh hiệu quả tăng điểm học tập.

### Kết quả 22/10/2026

- `npm run check` đạt: lint, 59 suites / 302 backend tests, 65 frontend tests và build hai ứng dụng.
- 14/14 browser cases đạt trên desktop/mobile cho hỗ trợ mới và hồi quy kế hoạch/chủ đề. Có kiểm tra giữ focus sau mở bước cuối và tải lại câu cùng kỹ năng; đã xem ảnh mobile.
- PostgreSQL integration trên schema tạm riêng đạt, gồm luồng DAS3H trả lời sai thật và các ranh giới hỗ trợ; schema được dọn sau chạy.
- Sau sửa focus, chạy lại frontend lint/build và 14 browser cases đều đạt.
- Agent nội dung triển khai policy; frontend editor triển khai giao diện; review độc lập kiểm tra backend, React và bàn phím, xác nhận không còn major/blocker. Các reviewer cấu hình riêng không có trong phiên nên dùng review tập trung thay thế.
- Cảnh báo chunk Three.js trên 500 kB có từ trước vẫn còn. Chưa push hoặc triển khai production.
