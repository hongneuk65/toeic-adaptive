# TOEIC Adaptive

Ứng dụng luyện TOEIC: thi thử, lý thuyết, flashcard, theo dõi kỹ năng DAS3H và gia sư AI/RAG.

Trang **Gợi ý học tiếp** có kế hoạch luyện theo kỹ năng, mốc ôn và gợi ý kiến thức nền. Xem [thiết kế và kiểm tra kế hoạch học](docs/adaptive-learning-plan.md).

Khi trả lời sai trong luyện thích ứng, có thể mở [hướng dẫn củng cố từng bước](docs/adaptive-practice-support.md), ôn lý thuyết và luyện thêm cùng kỹ năng.

Đối chứng nghiên cứu pyBKT và pyKT DKT được tách tại [KT benchmark](experiments/kt-benchmark/README.md), dùng cohort và split học viên tương ứng với DAS3H; không tự thay model đang phục vụ.

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

Bản web [TOEIC Compass](https://toeic-compass.up.railway.app) tự động phát hành từ nhánh `main` của GitHub qua Railway sau khi CI đạt. Chỉnh sửa hoặc commit ở máy chưa cập nhật web; cần push lên `main`. Cấu hình production và dữ liệu thư viện được mô tả trong [hướng dẫn production](docs/production-toeic-compass.md). Key và dữ liệu người học chỉ lưu phía server.


## Reading

Gợi ý hiện có trong từng thư viện lý thuyết, từ vựng, nghe và đọc; chế độ ôn từ vựng hiển thị đường cong ghi nhớ. Xem [cách phối hợp lịch ôn với DAS3H và kế hoạch nghiên cứu](docs/integrated-learning.md).

Các phần thích ứng trên nhánh nghiên cứu: [kế hoạch chọn kỹ năng](docs/adaptive-learning-plan.md), [hỗ trợ sau lỗi sai](docs/adaptive-practice-support.md), [đối chứng KT](experiments/kt-benchmark/README.md), [sinh câu hỏi từ nguồn](docs/reading-source-generation.md) và [thực nghiệm lập kế hoạch theo hướng ExRec](experiments/exrec-sandbox/README.md).

Module Reading có thư viện 25 bài mẫu, bài cá nhân AI, lịch sử theo phiên bản và từ vựng riêng. Sau migration, chạy `npm run seed:reading --prefix backend`. Xem [cấu hình, kiểm thử và hướng dẫn demo Reading](docs/reading.md).
