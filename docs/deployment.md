# Đóng gói và vận hành

## Docker Compose

1. Sao chép `.env.example` thành `.env` nếu chưa có.
2. Đặt mật khẩu PostgreSQL và JWT_SECRET ngẫu nhiên ít nhất 32 ký tự. Với ký tự đặc biệt trong mật khẩu, giá trị trong DATABASE_URL phải được URL-encode; cấu hình Compose mặc định thuận tiện nhất với mật khẩu hex ngẫu nhiên.
3. Đặt FRONTEND_URL theo địa chỉ web; mặc định http://localhost:8080. Thêm GEMINI_API_KEY hoặc OPENAI_API_KEY nếu muốn gọi mô hình thật. Vắng key, dịch vụ dùng phản hồi fallback hiện có.
4. Chạy `docker compose up -d --build`.
5. Kiểm tra `docker compose ps`, `docker compose logs backend migrate` và http://localhost:8080/api/health/ready.

Migration là service riêng: backend chỉ khởi động sau khi migration thành công và Redis sẵn sàng. Web chờ readiness của backend. Readiness kiểm tra PostgreSQL và Redis; `/health` chỉ kiểm tra API còn đáp ứng.

Database mới chưa có nội dung. Để tạo dữ liệu demo, chạy `docker compose exec backend npm run seed:demo`. Chỉ dùng trên database demo, không chạy seed này tự động khi deploy vì một số seed tạo thêm bản ghi mỗi lần chạy. Audio/ảnh của seed bulk là placeholder và cần thay bằng tài nguyên thật để demo Listening đầy đủ.

## Cập nhật

Backup PostgreSQL trước khi cập nhật schema. Chạy `docker compose build`, `docker compose run --rm migrate`, sau đó `docker compose up -d`. Kiểm tra logs và readiness. Migration không tự rollback; rollback image không đồng nghĩa rollback schema.

PostgreSQL và Redis dùng named volumes; `docker compose down` giữ dữ liệu, `down -v` xóa dữ liệu. `npm run infra:down` chỉ dừng hai service hạ tầng.

Chỉ frontend mở cổng công khai. DB/Redis bind localhost để phát triển. Với máy chủ thực, đặt HTTPS reverse proxy phía trước web và giới hạn truy cập host. Nginx tắt buffering cho API để SSE truyền từng phần.

## Deploy không dùng Docker

Chạy `npm run setup`, `npm run build`; đặt biến môi trường backend, chạy migration trong thư mục backend rồi `npm run start:prod --prefix backend`. Phục vụ `frontend/dist` bằng web server có SPA fallback và proxy `/api/` đến backend (bỏ tiền tố `/api`). Nếu API ở domain khác, đặt VITE_API_URL trước khi build frontend và FRONTEND_URL tương ứng cho CORS.

Backend đọc `.env` từ working directory hoặc `backend/.env`; production container nhận biến môi trường từ Compose. Không đưa secret vào frontend: biến VITE_* được nhúng vào bundle công khai.

## Giới hạn xác minh

Lint, unit tests và build không thay thế kiểm thử trình duyệt, Redis thật và API mô hình thật. Test PostgreSQL riêng: `npm run test:learning:integration --prefix backend`; script tạo/xóa schema ngẫu nhiên, cần DB cho phép thao tác schema.
