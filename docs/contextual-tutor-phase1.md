# Gia sư TOEIC theo ngữ cảnh — đợt 1

Phạm vi: giải thích tại câu hỏi luyện tập và bài thi đã nộp. Giữ NestJS, endpoint JSON/SSE và nhà cung cấp AI hiện có. Không thay đổi thuật toán DAS3H, trang chủ hoặc tự động huấn luyện mô hình. Quản lý phiên hội thoại đầy đủ, phiên bản tri thức bất biến và hợp nhất chat tự do nằm ở các đợt sau.

## Trách nhiệm

- `TutorContextService`: kiểm tra quyền, lấy câu hỏi và tư liệu server; khi có `attemptId`, chỉ dùng snapshot và đáp án đã nộp của đúng người học. Không tự thay snapshot bằng câu hỏi hiện tại khi thiếu dữ liệu. Chế độ không có attempt được gắn `practice_input`, không giả danh lịch sử đã xác thực.
- `tutor-access.policy`: chặn chat và giải thích khi còn bài thi chưa nộp, kể cả hết giờ. Kiểm tra trước SSE headers và trước/sau sinh lời giải. Lượt làm cũ thiếu snapshot được thông báo để người học dùng chế độ luyện tập. Đây là chính sách theo thời điểm request, chưa có cơ chế hủy chủ động tất cả phiên AI khi một thiết bị khác bắt đầu thi.
- `LearnerEvidenceService`: đọc dự đoán mô hình đã huấn luyện và lịch sử từng kỹ năng, không ghi năng lực. Điểm là trung bình dự đoán thành công của tập câu theo kỹ năng từ API DAS3H hiện có, không phải chẩn đoán thành thạo.
- `explanation.policy`: tách quy tắc trình bày khỏi sự thật và tài liệu; lựa chọn dễ hơn/ví dụ/sâu hơn không ghi một sự kiện luyện tập.
- `TutorKnowledgeService`: chỉ truy xuất KnowledgeChunk đã duyệt, có nguồn HTTPS, phiên bản, người duyệt, thời điểm và hash khớp. Không đưa TheoryLesson thô vào luồng giải thích mới. Không cache để thay đổi/thu hồi có hiệu lực ở request tiếp theo.
- `RagExplainerService`: điều phối, yêu cầu JSON có sections/citations, kiểm tra schema và ID nguồn trước khi phát văn bản qua SSE. Gemini/OpenAI, timeout và hủy request vẫn dùng RagLlmService. Tắt heuristic fallback của provider trong luồng này.

## Quy tắc trình bày thử nghiệm

`tutor-evidence-v1`: xét 30 ngày gần nhất, tối thiểu 8 lượt, 5 câu khác nhau và 5 lượt trong 14 ngày cho từng kỹ năng. Không có dự đoán hợp lệ, lịch sử ít/cũ hoặc truy vấn chạm giới hạn 2.000 dòng thì không tự kết luận. Khi mọi kỹ năng đủ điều kiện, dùng điểm dự đoán thấp nhất để chọn cách hỗ trợ thận trọng: dưới 0,45 giải thích từng bước; từ 0,7 giải thích ngắn; ở giữa tập trung quy tắc. Còn lại giải thích trung tính.

Các ngưỡng này là heuristic có phiên bản, **chưa được kiểm chứng như ngưỡng trình độ**. Không hiển thị phần trăm thành thạo. Cần đánh giá trên dữ liệu giữ riêng trước khi thay đổi/khẳng định hiệu quả. Học viên luôn có thể chọn cách diễn đạt khác; hồ sơ bằng chứng giữ nguyên.

## Duyệt và cập nhật tài liệu

Migration thêm metadata, mặc định DRAFT; không tự duyệt tài liệu cũ. Do chưa có nguồn nào được con người duyệt theo quy trình mới, triển khai có thể trả danh sách nguồn rỗng. UI thông báo thiếu căn cứ rõ ràng; không xem nội dung cũ/AI fallback là đã thẩm định.

Sau khi build backend, một người có chuyên môn cần đọc nội dung và đối chiếu nguồn. CLI mặc định chỉ in nội dung/hash để kiểm tra:

```text
node scripts/review-tutor-knowledge.cjs --id 1 --source https://example.org/actual-source --version revision-1 --reviewer reviewer-name
```

Thêm `--approve` chỉ sau khi đã duyệt thực sự. Không dùng tên người duyệt giả hoặc duyệt hàng loạt tự động. Thu hồi: `node scripts/review-tutor-knowledge.cjs --id 1 --revoke`. Mọi chỉnh sửa nội dung, tag, keywords hoặc metadata nguồn làm hash hết khớp, nên phải duyệt lại. CLI không được chạy tự động lúc boot. Lịch sử phiên bản bất biến và màn hình biên tập/duyệt thuộc đợt 2; hiện mới có phiên bản hiện hành và hash trong phản hồi.

## Giới hạn chất lượng

- Kiểm tra ID nguồn chỉ ngăn trích nguồn không tồn tại; không chứng minh từng nhận định được nguồn hỗ trợ. Chưa tuyên bố chất lượng hoặc hiệu quả học tập.
- JSON/prompt không bảo đảm model luôn đúng. Server giữ đáp án cố định; người có chuyên môn vẫn cần đánh giá nội dung từng phần, ví dụ và sự liên quan của trích dẫn.
- Không suy diễn audio/hình ảnh chưa phân tích; trả cảnh báo khi thiếu transcript/tư liệu hoặc phải cắt ngữ cảnh dài.
- Để kiểm tra schema và trích dẫn trước hiển thị, luồng này đệm câu trả lời AI rồi mới phát một đoạn SSE hợp lệ. Heartbeat và hủy vẫn hoạt động; không còn hiển thị token chưa được kiểm tra.
- Chat tự do và retriever cũ chưa chuyển sang kho duyệt/chính sách giải thích mới trong đợt 1, ngoài việc dùng chung quyền trợ giúp trong bài thi. Cần hoàn tất đợt 2–3 trước khi áp dụng tuyên bố trên cho toàn bộ chatbot.

## Đánh giá tiếp theo

Lập bộ câu hỏi có đáp án và nguồn do chuyên gia duyệt, bao phủ Part 1–7, nhiều kỹ năng, thiếu transcript, thiếu nguồn và các lựa chọn sai/để trống. Chấm độc lập: đáp án đúng, căn cứ đúng đoạn, không suy đoán trình độ/nguyên nhân, ví dụ hợp lệ, mức dễ hiểu và không rò đáp án trong bài thi. Báo cáo tách kiểm thử phần mềm khỏi đánh giá sư phạm; không dùng lượt bấm nút hỗ trợ như nhãn năng lực.
