# TOEIC Adaptive

Ứng dụng luyện TOEIC: thi thử, lý thuyết, flashcard, theo dõi kỹ năng DAS3H và gia sư AI/RAG.

Listening theo từng đoạn audio/video/YouTube tại `/listening`; xem [hướng dẫn Listening](docs/listening.md). Chạy `npm run seed:listening --prefix backend` để có audio demo ổn định. Kết quả Listening lưu riêng, không cập nhật DAS3H.

## Cấu trúc

```text
backend/             NestJS API, BullMQ worker, Prisma schema/migrations/seeds
frontend/            React + Vite + Tailwind
deploy/              Nginx reverse proxy, hỗ trợ SPA và SSE
docs/                Hướng dẫn vận hành và tài liệu dự án
.github/workflows/   CI kiểm tra lint, test, build và Docker images
compose.yaml         PostgreSQL, Redis, migration, API và web
```

Hai ứng dụng giữ lockfile riêng; lệnh ở gốc điều phối chúng bằng `npm --prefix`.
Các thư mục audio và `DE_THI.txt` là tài liệu nguồn, chưa phải tài nguyên được ứng dụng phục vụ; không đưa vào Docker image.

## Chạy local

Yêu cầu Node **22.22.3+**, npm và PostgreSQL/Redis (hoặc Docker Desktop).

```powershell
Copy-Item .env.example .env
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm run setup
npm run infra:up
npm run db:migrate
```

Hạ tầng local của workspace dùng lại hai container `toeic-postgres` (5432) và `toeic-redis` (6379). `infra:up` chỉ khởi động container có sẵn, không tạo container hoặc volume mới; nếu thiếu container, lệnh sẽ báo lỗi. Compose dành cho triển khai riêng, không chạy song song với hạ tầng local trên cùng cổng.

Nếu đã có `.env`, giữ cấu hình hiện tại. `backend/.env` cần trỏ đúng database và thông tin đăng nhập của PostgreSQL hiện có. Chạy hai terminal:

```powershell
npm run dev:backend
```

```powershell
npm run dev:frontend
```

Web: http://localhost:5173. Vite chuyển `/api` đến API ở cổng 3000.

Database mới cần dữ liệu. Chỉ chạy `npm run seed:demo --prefix backend` trên DB demo: các seed hiện tại không hoàn toàn idempotent. Câu hỏi bulk là dữ liệu tổng hợp, URL audio/ảnh là placeholder.

## Kiểm tra và deploy

```powershell
npm run check
docker compose --env-file .env.example config --quiet
```

Xem [hướng dẫn deploy](docs/deployment.md), [kiến trúc](docs/architecture.md), [kết quả kiểm tra trước đây](docs/verification.md) và [RAG](docs/rag-performance.md).

Bản web [TOEIC Compass](https://toeic-compass.up.railway.app) dùng nguồn nhánh `main` của GitHub trên Railway. Chỉnh sửa hoặc commit ở máy chưa cập nhật web; cần push lên `main`. Tự động phát hành sau CI cần cấp quyền GitHub cho Railway; trạng thái kết nối và dữ liệu thư viện được mô tả trong [hướng dẫn production](docs/production-toeic-compass.md). Key và dữ liệu người học chỉ lưu phía server.


## Reading

Module Reading có thư viện 25 bài mẫu, bài cá nhân AI, lịch sử theo phiên bản và từ vựng riêng. Sau migration, chạy `npm run seed:reading --prefix backend`. Xem [cấu hình, kiểm thử và hướng dẫn demo Reading](docs/reading.md).
