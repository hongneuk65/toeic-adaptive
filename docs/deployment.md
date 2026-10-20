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

### Frontend trên Vercel, backend riêng

Với Railway, dùng file `railway.json` ở gốc repository: giữ Root Directory là gốc để Dockerfile copy được `backend/`. File đã đặt Dockerfile, migration trước deploy, start command và healthcheck. Chỉ gắn cấu hình này với service backend, không dùng cho PostgreSQL/Redis.

Tạo PostgreSQL và Redis cùng project. Sao chép mẫu `docs/railway-variables.env.example` vào Variables của backend, thay JWT_SECRET và FRONTEND_URL; dùng Add Reference nếu tên dịch vụ khác `Postgres`/`Redis`. Các biến REDIS_USERNAME và REDIS_PASSWORD được hỗ trợ cho Redis có xác thực. Mount Volume tại `/app/storage`, Generate Domain cổng 3000. `LISTENING_ASR_ENABLED=false` cho bản demo không có model ASR; các chức năng cần model sẽ chưa hoạt động. Không seed tự động mỗi lần deploy.

Sau khi backend `/health/ready` trả `{"status":"ok"}`, dùng Railway SSH vào đúng service backend để chạy một lần `npm run seed:demo`, `npm run seed:reading`, `npm run seed:listening` trên database demo mới. Sau đó tạo tài khoản qua giao diện đăng ký. Các lệnh seed có thể thêm bản ghi khi chạy lại.

Import repository vào Vercel, đặt **Root Directory** là `frontend`, framework Vite. File `frontend/vercel.json` cấu hình build và SPA fallback để mở trực tiếp `/reading`, `/dashboard` hoặc tải lại trang không bị 404. `/api` không được fallback thành HTML.

Trước khi deploy, đặt biến môi trường Vercel `VITE_API_URL=https://<backend-host>` (không thêm `/api` vì NestJS hiện không có global prefix). Đặt `FRONTEND_URL=https://<ten-du-an>.vercel.app` ở backend cho CORS. Sau khi thay `VITE_API_URL`, redeploy frontend vì Vite nhúng giá trị lúc build. Dùng domain production ổn định khi gửi cho giảng viên; preview domain khác cần cấu hình CORS tương ứng.

Backend hiện cần PostgreSQL, Redis, worker BullMQ chạy liên tục và vùng lưu trữ Listening. Triển khai backend trên dịch vụ container/VPS phù hợp với các thành phần này, dùng cấu hình Docker hiện có hoặc quy trình bên dưới. Không đưa `.env`, database local hay khóa AI vào frontend. Chạy migration trước khi khởi động API; chỉ seed nội dung một lần trên database demo mới.

Xác minh trước khi gửi link: backend `/health/ready` trả thành công; đăng ký/đăng nhập trên domain Vercel; tải dữ liệu Reading/Listening; mở trực tiếp một route rồi tải lại trang. Kiểm tra deployment protection cho phép giảng viên truy cập domain được gửi.

Chạy `npm run setup`, `npm run build`; đặt biến môi trường backend, chạy migration trong thư mục backend rồi `npm run start:prod --prefix backend`. Phục vụ `frontend/dist` bằng web server có SPA fallback và proxy `/api/` đến backend (bỏ tiền tố `/api`). Nếu API ở domain khác, đặt VITE_API_URL trước khi build frontend và FRONTEND_URL tương ứng cho CORS.

Backend đọc `.env` từ working directory hoặc `backend/.env`; production container nhận biến môi trường từ Compose. Không đưa secret vào frontend: biến VITE_* được nhúng vào bundle công khai.

## Giới hạn xác minh

Lint, unit tests và build không thay thế kiểm thử trình duyệt, Redis thật và API mô hình thật. Test PostgreSQL riêng: `npm run test:learning:integration --prefix backend`; script tạo/xóa schema ngẫu nhiên, cần DB cho phép thao tác schema.
