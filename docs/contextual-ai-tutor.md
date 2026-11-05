# AI Tutor theo câu hỏi đang học

## Phạm vi

- Chữa bài thi đã nộp: mỗi câu có nút **Hỏi AI về câu này**. Với nhóm Part 3/4/6/7, chọn nút ở đúng câu muốn hỏi.
- Luyện tập thích ứng: câu đang hiển thị được đăng ký làm ngữ cảnh cho AI Tutor. Có thể hỏi tiếp từ cửa sổ giải thích.
- Quiz ôn kiến thức: chọn đáp án sẽ xác định câu đang học; nút hỏi ở từng câu vẫn dùng được sau khi chấm bài.
- Khung chat hiển thị nhãn câu. **Hỏi chung · bỏ câu này** chuyển sang hội thoại tổng quát.
- Đổi câu/lượt thi sẽ tải hội thoại tương ứng và hủy phản hồi đang chạy. Rời trang hoặc đổi tài khoản sẽ bỏ ngữ cảnh cũ.
- Reading có tutor riêng theo lượt đọc; thay đổi này không chuyển ID câu của Reading sang ngân hàng câu TOEIC.

## Luồng dữ liệu

1. Frontend giữ ngữ cảnh gồm `questionId`, `attemptId` (nếu chữa bài), lựa chọn hiện tại và nhãn câu. Không gửi nguyên đề/lời giải do trình duyệt tự khai báo.
2. Backend xác thực người dùng. Với lượt thi, kiểm tra sở hữu, đã nộp và câu thuộc lượt thi; lấy đề từ snapshot và lựa chọn từ đáp án đã lưu. Lựa chọn gửi từ client không ghi đè đáp án thi.
3. `TutorContextService` chuẩn bị đề, các phương án, lựa chọn, đáp án đúng, đoạn đọc, lời giải lưu và kỹ năng. Đề nghe thiếu transcript/đề có ảnh được đánh dấu giới hạn, không coi văn bản là kết quả nghe/xem ảnh.
4. Retriever tìm tài liệu liên quan; lịch sử chỉ lấy của cùng người dùng, câu hỏi và lượt thi. LLM nhận ngữ cảnh này cùng câu hỏi tiếp nối, trả lời qua SSE.
5. Nếu không có tài liệu phù hợp hoặc provider không dùng được, hệ thống trả thông báo có nhãn; không coi lời giải giả lập/offline là nội dung AI đã sinh.

Đây là contextual RAG, không phải một model Knowledge Tracing mới. DAS3H tiếp tục theo dõi học tập và đề xuất luyện tập. Không cần huấn luyện lại DAS3H cho chức năng chat này.

## Provider và cấu hình

Sử dụng `RagLlmService` hiện có: ưu tiên Gemini, sau đó OpenAI khi được cấu hình. Mặc định trong mã hiện tại là `gemini-2.5-flash` và `gpt-4o-mini`; có thể đổi bằng biến môi trường. Chỉ cần cấu hình provider muốn dùng trên backend:

```dotenv
GEMINI_API_KEY=<private>
GEMINI_MODEL=gemini-2.5-flash
# Hoặc:
OPENAI_API_KEY=<private>
OPENAI_MODEL=gpt-4o-mini
```

Không đưa khóa vào frontend, Git hay URL. Nội dung câu hỏi, lựa chọn và hội thoại liên quan sẽ được gửi đến provider đã cấu hình để tạo câu trả lời. Phải có tài liệu đã duyệt phù hợp trong kho tri thức để chat đưa ra giải thích có căn cứ. Khởi động lại backend sau khi cập nhật biến môi trường.

## API

- `POST /rag/chat` và `POST /rag/chat-stream`: `message`, `questionId?`, `attemptId?`, `selectedAnswer?`, `skillCode?`.
- `GET /rag/chat-history?questionId=...&attemptId=...`: hội thoại của phạm vi hiện tại.
- `DELETE /rag/chat-history` với cùng query: chỉ xóa phạm vi đang xem. Không có query là hội thoại tổng quát.
- Có `attemptId` thì bắt buộc có `questionId` hợp lệ. Mọi truy vấn giới hạn theo người dùng đăng nhập.
- Không trả lời chat/đọc lịch sử khi còn bài thi chưa nộp, kể cả đã hết giờ.

Không cần migration. Dùng cột `AiChatMessage.contextData` hiện có để lưu scope chuẩn hóa. Lịch sử cũ không có scope an toàn không được ghép tùy tiện vào câu mới; dữ liệu gốc vẫn được giữ.

## Kiểm thử

- Backend: `npm --prefix backend test -- --runInBand --testPathPatterns=rag`.
- Frontend: `npm --prefix frontend test`; `npm --prefix frontend run test:browser -- contextual-chat contextual-tutor`.
- Kiểm tra sở hữu/snapshot/lựa chọn thật; tách lịch sử; scope sai; chặn thi; streaming; đổi câu, nhóm nhiều câu, đóng/mở lại và rời trang.
- Các phản hồi trong browser test được giả lập. Chất lượng giải thích của provider thật cần được kiểm tra riêng sau khi cấu hình khóa và kho tài liệu.
