# TOEIC Adaptive

Ứng dụng luyện TOEIC: thi thử, lý thuyết, flashcard, theo dõi kỹ năng DAS3H và gia sư AI/RAG.

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

Nếu đã có `.env`, giữ cấu hình hiện tại. Sửa thông tin DB và JWT trước khi dùng; mật khẩu DB trong hai file phải khớp. Chạy hai terminal:

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

