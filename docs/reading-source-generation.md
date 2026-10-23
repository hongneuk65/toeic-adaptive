# Sinh câu hỏi Reading từ văn bản nguồn

Trên nhánh `codex/adaptive-recommendation`, mở **Reading → Tạo bài từ văn bản của bạn**, dán đoạn tiếng Anh và tạo bài. Phần này tham khảo hướng tổ chức nội dung và mục tiêu học của adaptive-learning-core; triển khai riêng bằng TypeScript, không nhập code hoặc model của repo đó. Không cần migration hay dependency mới.

## Luồng xử lý

1. Chia nguồn thành các thẻ liên tiếp khoảng 1.800 ký tự, giữ nguyên nội dung và vị trí UTF-16. Đây là chia đoạn có thể truy vết, chưa phải tìm kiếm embedding/RAG.
2. AI tạo câu hỏi, đáp án, giải thích, trích dẫn chính xác và mục tiêu học gắn với thẻ nguồn. Backend kiểm tra cấu trúc, vị trí trích dẫn và quan hệ giữa trích dẫn với thẻ.
3. Một lượt AI riêng trả lời lại chỉ từ nguồn, câu hỏi và lựa chọn. Lượt này không nhận đáp án đề xuất, giải thích, trích dẫn hay mục tiêu của bản nháp. Đáp án phải khớp và chỉ có một lựa chọn được hỗ trợ.
4. Một lượt AI tiếp theo kiểm tra giải thích, độ đủ của bằng chứng và mục tiêu học. Chỉ khi mọi kiểm tra đạt mới lưu phiên bản READY.

Ba lượt dùng chung thời hạn `READING_AI_TIMEOUT_MS` (mặc định 45 giây), cùng provider được cấu hình và không dùng fallback. Một yêu cầu tạo bài có thể gọi AI thành công ba lần; hạn mức tạo bài vẫn tính theo yêu cầu của pipeline. Lỗi provider, kết quả thiếu, đáp án bất đồng hoặc bằng chứng không đạt đều làm bài FAILED, giữ lại nguồn để thử lại và không lưu phiên bản chưa qua kiểm tra.

Nguồn được che email và số điện thoại trước khi cắt thẻ gửi AI, giữ nguyên độ dài để bảo toàn vị trí. Cơ chế này không nhận diện mọi loại dữ liệu cá nhân.

## Mục tiêu học và hiển thị

- DETAIL: REMEMBER — nhớ thông tin.
- MAIN, PURPOSE, PARAPHRASE: UNDERSTAND — hiểu nội dung.
- INFERENCE: ANALYZE — phân tích.

Đây là phân loại nhiệm vụ, không phải độ khó đã hiệu chỉnh hoặc mức thành thạo. Trước khi nộp, API chỉ trả nhãn `learningLevel`; không trả đáp án, bằng chứng, mục tiêu nội bộ hoặc ID thẻ nguồn. Câu hỏi cũ không bị tự gắn nhãn. Khi sửa bản nháp thủ công, metadata mục tiêu học được bỏ để không giữ mục tiêu hay liên kết nguồn đã lỗi thời.

AI kiểm tra bằng các lượt riêng vẫn có thể cùng mắc lỗi. Bài tiếp tục mang trạng thái AI tạo, chưa duyệt chuyên môn; không được coi là bài đã được chuyên gia xác nhận.

## Phạm vi

Hỗ trợ văn bản dán vào, tối thiểu 40 từ, tối đa theo `READING_MAX_TEXT_CHARS` (mặc định 10.000 ký tự). Chưa thêm đọc PDF/Word, hiệu chỉnh IRT, tự gắn kỹ năng DAS3H hoặc cập nhật mastery từ câu hỏi sinh mới. Reading tiếp tục lưu kết quả riêng. ExRec/RL chưa được tích hợp vào chọn bài thực tế.

## Kiểm chứng ngày 22/10/2026

- `npm run check`: lint, unit tests và build cả backend/frontend đạt.
- Sau chỉnh sửa cuối về bản nháp thủ công: 23 tests thuộc `reading-generation.spec.ts` và `source-admin.spec.ts`, lint và build backend đạt.
- `npm run test:browser --prefix frontend -- reading-generation.spec.ts`: 8 ca desktop/mobile đạt; đã xem ảnh mobile kiểm tra bố cục.
- Từ backend, `node test/learning.integration.cjs`: PostgreSQL trong schema tạm kiểm tra từ chối đáp án sai, không tạo version, thử lại thành công, lưu nguồn nguyên vẹn và ẩn metadata trước nộp. Không sửa dữ liệu người học hiện có.
- Smoke tùy chọn sau build: `$env:READING_GENERATION_LIVE='1'; node test/reading-generation.live.cjs`. Đã chạy với provider thật trên nguồn tổng hợp: tạo ba câu hỏi, qua đủ ba lượt. Một mẫu xác nhận luồng hoạt động, không phải đánh giá chất lượng trên nhiều tài liệu.

Browser tests dùng API giả lập; integration dùng AI giả lập để kiểm tra các nhánh lỗi có chủ đích. Smoke thật bổ sung kiểm tra tích hợp provider. Chưa push hoặc triển khai production.
