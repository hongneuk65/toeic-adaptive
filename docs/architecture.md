# Kiến trúc

Frontend gọi REST/SSE qua `/api`. Khi phát triển, Vite proxy sang NestJS; khi đóng gói, Nginx xử lý proxy và SPA fallback.

Backend tổ chức theo tính năng: auth, admin, exam, theory, flashcard, das3h, mastery và rag. Prisma quản lý PostgreSQL. Queue module chứa producer và worker BullMQ trong cùng tiến trình API; muốn tách worker sau này cần entrypoint riêng và tránh đăng ký worker ở API.

Luồng học: chấm đáp án ở server → lưu kết quả → queue → DAS3H cập nhật năng lực, lịch sử và mastery trong transaction → trang Gợi ý đọc mastery/lộ trình. Job retry có chống ghi lặp. Hàng đợi lỗi khi enqueue hiện chỉ được log; chưa có transactional outbox đảm bảo phục hồi sự kiện bị mất.

RAG đọc KnowledgeChunk/TheoryLesson, xếp hạng từ khóa và ghép ngữ cảnh cho Gemini/OpenAI. Chat và giải thích lỗi có SSE. Lộ trình hiện dựa trên quy tắc mastery, chưa dùng LLM để tạo phiên học theo ngân sách thời gian.

Các gói có lockfile riêng nhằm giữ nguyên cây dependency hiện có. Không có shared package vì chưa có phần mã dùng chung thực sự giữa client/server. Schema và migrations nằm cùng backend; thay đổi schema phải đi kèm migration, không dùng `db push` khi deploy.

Tài liệu lịch sử: `project-notes.md`, `verification.md`, `rag-performance.md`. Chúng phản ánh thời điểm ghi nhận, không tự chứng minh trạng thái runtime hiện tại.
