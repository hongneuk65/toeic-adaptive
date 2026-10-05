# Kiểm tra sau chuẩn hóa repo — 2026-10-05

## Đã chạy và thành công

- `npm run check`: lint backend/frontend, 87 backend tests (20 suites), 24 frontend tests và production build cả hai ứng dụng.
- Bộ kiểm tra dùng Node v24.19.0 có sẵn trong runtime; Node mặc định của máy vẫn là v20.20.2. Repo yêu cầu Node 22.22.3+ để phù hợp dependency hiện tại; Docker/CI dùng Node 22.
- `npm run test:learning:integration --prefix backend`: PostgreSQL thật, migration cho schema mới/cũ, giữ dữ liệu RAG cũ, submit đồng thời/rollback, mastery retry/rollback và tuần tự sự kiện cùng user. Script đã dọn schema test.
- `npm run db:generate`: Prisma Client được tạo thành công qua lệnh ở gốc repo.
- `npm ci --prefix backend --dry-run --ignore-scripts --offline` và tương tự frontend: lockfiles hợp lệ cho CI. Đây là dry-run, chưa phải cài sạch vào thư mục mới.
- `docker compose --env-file .env.example config --quiet`: cấu hình Compose hợp lệ.
- `git diff --check`: không có lỗi whitespace; có cảnh báo LF/CRLF của Windows.

Health check mới có test PostgreSQL/Redis sẵn sàng và từng dependency lỗi. Backend/frontend build thành công sau khi đổi API URL mặc định sang `/api`.

## Chưa xác minh trực tiếp

Docker Desktop Linux engine chưa chạy, nên chưa build image hay chạy Compose trên máy này. Redis không nghe cổng 6379 lúc kiểm tra; chưa kiểm thử delivery queue thật và readiness của stack đang chạy. Chưa kiểm thử trình duyệt hoặc lời trả lời từ dịch vụ AI thật.

CI được bổ sung để build Docker images trên Linux, nhưng chưa có kết quả CI từ remote trong lượt làm việc này. Không deploy và không thay dữ liệu ứng dụng hiện có.
