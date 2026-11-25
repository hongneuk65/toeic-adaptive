# TOEIC Adaptive

Hệ thống học tập thích ứng cho luyện thi TOEIC, là phần mã nguồn của khóa luận *Xây dựng hệ thống học tập thích ứng dựa trên dữ liệu luyện tập cho luyện thi TOEIC* (Nguyễn Văn Hồng, MSV 11236114, Khoa Công nghệ thông tin, Đại học Kinh tế Quốc dân).

Chức năng chính: thi thử và luyện tập theo Part, chọn câu hỏi thích ứng bằng mô hình DAS3H, ôn từ vựng với lịch ôn HLR, gia sư AI có truy hồi tài liệu (RAG), luyện nghe, luyện đọc và trang quản trị.

## Chạy bằng Docker

Chỉ cần cài [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows, macOS) hoặc Docker Engine kèm Docker Compose v2 (Linux). Không cần cài Node.js, PostgreSQL hay Redis. Máy cần khoảng 8 GB RAM, 10 GB ổ đĩa trống và có Internet ở lần chạy đầu.

1. Mở Docker Desktop và chờ đến khi Docker báo đang chạy.
2. Mở terminal tại thư mục chứa tệp `compose.yaml` (thư mục gốc của repo, hoặc thư mục `Source` nếu dùng bản ZIP nộp).
3. Tạo tệp cấu hình từ tệp mẫu. Giá trị mẫu dùng được ngay; muốn mã xác nhận được gửi tới hộp thư thật thì điền thêm `SMTP_PASS` (xem mục Email xác nhận ở cuối trang).

   ```bash
   cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
   ```

4. Build và khởi động toàn bộ hệ thống:

   ```bash
   docker compose up -d --build
   ```

   Lần đầu mất khoảng 10 đến 20 phút để tải image nền, cài thư viện và build. Các lần sau khởi động trong vài chục giây.

5. Mở trình duyệt tại **http://localhost:8080** và chọn Đăng ký. Nhập email và mật khẩu, hệ thống gửi mã xác nhận 6 chữ số. Khi `SMTP_PASS` còn trống, mã được đưa vào hộp thư thử nghiệm Mailpit: mở **http://localhost:8025**, đọc mã trong email mới nhất rồi nhập vào trang đăng ký. Khi đã điền `SMTP_PASS`, mã được gửi qua Gmail tới hộp thư thật (kiểm tra cả thư rác). Xác nhận xong là đăng nhập vào hệ thống.

Lệnh `docker compose up` tự chạy lần lượt các bước sau, không cần làm tay:

| Dịch vụ | Việc thực hiện |
|---|---|
| `postgres`, `redis` | Cơ sở dữ liệu PostgreSQL 16 và hàng đợi Redis 7 |
| `migrate` | Tạo 40 bảng bằng Prisma migration, sau đó nạp thư viện học thật nếu có tệp `backend/prisma/public-library.json.gz`, nếu không có thì nạp dữ liệu mẫu tổng hợp (chỉ nạp khi cơ sở dữ liệu còn trống) |
| `listening-model` | Tải mô hình nhận dạng giọng nói cho phần Listening |
| `backend` | API NestJS ở cổng nội bộ 3000, dùng mô hình DAS3H đã huấn luyện `backend/models/das3h-own-v1.json` |
| `mailpit` | Hộp thư thử nghiệm tại cổng 8025, nhận mã xác nhận khi `.env` chưa có mật khẩu Gmail (`SMTP_PASS`) |
| `frontend` | Giao diện React phục vụ qua Nginx ở cổng 8080, chuyển `/api` về backend |

Kiểm tra trạng thái:

```bash
docker compose ps                       # postgres, redis, backend, frontend ở trạng thái running/healthy
curl http://localhost:8080/api/health/ready
```

Dừng hệ thống: `docker compose down`. Xóa cả dữ liệu để chạy lại từ đầu: `docker compose down -v`.

### Dữ liệu học

- Kho mã (cả bản trên GitHub và bản ZIP nộp kèm khóa luận) có tệp `backend/prisma/public-library.json.gz`. Ở lần chạy đầu, hệ thống tự nạp 5.049 câu hỏi, 114 bài lý thuyết, 196 bài đọc, 854 thẻ từ vựng và dữ liệu Listening. Audio và hình ảnh của đề thi (khoảng 658 MB) không kèm theo vì vượt giới hạn dung lượng nộp, nên các câu Part 1 đến 4 vẫn hiển thị nhưng không phát được âm thanh. Từ điển tra nghĩa nhanh cũng không kèm theo.
- Nội dung câu hỏi được thu thập từ Santa và chỉ dùng cho mục đích nghiên cứu. Nếu thiếu tệp dữ liệu này, hệ thống tự nạp dữ liệu mẫu tổng hợp để vẫn thử được đăng ký, lý thuyết và luyện nghe.

### Tài khoản quản trị

Tài khoản mới đăng ký có vai trò người học. Để xem trang quản trị, nâng quyền một tài khoản đã đăng ký (thay email cho đúng), rồi đăng xuất và đăng nhập lại:

```bash
docker compose exec postgres psql -U toeic -d toeic -c "UPDATE \"User\" SET role='ADMIN' WHERE email='ban@example.com';"
```

### Cấu hình tùy chọn trong `.env`

| Biến | Tác dụng |
|---|---|
| `GEMINI_API_KEY` | Bật gia sư AI, giải thích lỗi sai bằng AI và embedding cho RAG. Để trống thì các chức năng này không hoạt động, phần còn lại của hệ thống vẫn chạy |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Tài khoản gửi mã xác nhận. Mặc định là Gmail (`smtp.gmail.com`, cổng 465, `SMTP_SECURE=true`, mật khẩu ứng dụng). Để trống `SMTP_PASS` thì mã được gửi vào Mailpit |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Đăng nhập bằng GitHub |
| `MAILPIT_PORT` | Đổi cổng của Mailpit khi cổng 8025 đã bị dùng |
| `WEB_PORT` | Đổi cổng web khi cổng 8080 đã bị chương trình khác dùng, đồng thời sửa `FRONTEND_URL` theo cùng cổng. PostgreSQL và Redis không mở cổng ra máy nên không trùng với cơ sở dữ liệu có sẵn |

Sau khi sửa `.env`, chạy lại `docker compose up -d`.

## Phát triển không dùng Docker cho ứng dụng

Yêu cầu Node.js 22.22.3 trở lên. PostgreSQL và Redis vẫn chạy bằng Docker:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
docker compose -f compose.yaml -f compose.dev.yaml up -d postgres redis mailpit
npm run setup                   # cài thư viện backend, frontend và sinh Prisma client
npm run db:migrate
npm run dev:backend             # API: http://localhost:3000
npm run dev:frontend            # Web: http://localhost:5173
```

Tệp `compose.dev.yaml` mở cổng 5432 và 6379 cho PostgreSQL, Redis (đổi bằng `POSTGRES_HOST_PORT`, `REDIS_HOST_PORT` trong `.env`). Email chứa mã xác nhận khi đăng ký xem tại http://localhost:8025. Mật khẩu PostgreSQL trong `backend/.env` (biến `DATABASE_URL`) phải trùng `POSTGRES_PASSWORD` trong `.env`; hai tệp mẫu đã khớp nhau. Để có dữ liệu trên cơ sở dữ liệu trống, chạy `node --env-file=.env scripts/import-public-content.cjs prisma/public-library.json.gz --if-empty` trong thư mục `backend`, hoặc `npm run seed:demo --prefix backend` để sinh dữ liệu mẫu tổng hợp.

## Kiểm thử

```bash
npm run check                   # lint, kiểm thử đơn vị backend và frontend, build
npm run test:browser --prefix frontend
```

CI trên GitHub Actions chạy cùng các bước này cho mỗi lần đẩy lên nhánh `main`.

## Cấu trúc thư mục

| Thư mục | Nội dung | Mục trong báo cáo |
|---|---|---|
| `backend/` | API NestJS, Prisma (`prisma/schema.prisma`, `prisma/migrations/`), suy luận DAS3H (`src/das3h/`), lịch ôn HLR (`src/flashcard/`), gia sư RAG (`src/rag/`), xác thực (`src/auth/`) | Chương 3 |
| `backend/models/das3h-own-v1.json` | Bộ hệ số DAS3H đã huấn luyện, dùng khi phục vụ | 4.1.5 |
| `frontend/` | Giao diện React + Vite | 4.2 |
| `ednet_santa_mapping_clean/` | Quy trình xây dựng bộ nhãn OWN: nối EdNet với Santa, gán nhãn theo ngưỡng, gom nhóm | 4.1.2 |
| `experiments/das3h-production/` | Huấn luyện DAS3H trên EdNet KT4 | 4.1.1, 4.1.3 |
| `experiments/kt-benchmark/` | So sánh DAS3H với item-only, Log-PFA, BKT, DKT; `results/` chứa kết quả đã báo cáo; `bang_chung_so_sanh_mo_hinh.ipynb` (và bản `.html`) tái lập Bảng 4.6, 4.7 | 4.1.4 |
| `experiments/hlr/` | Huấn luyện trọng số lịch ôn HLR | |
| `docs/` | Tài liệu kiến trúc, triển khai và từng chức năng | Phụ lục A |
| `compose.yaml`, `deploy/` | Chạy toàn bộ hệ thống bằng Docker Compose, cấu hình Nginx | Phụ lục A |
| `.github/workflows/` | CI: lint, kiểm thử, build | |

Không kèm theo: `node_modules`, dữ liệu EdNet gốc, nội dung câu hỏi gốc thu thập từ Santa, tệp `.env` và khóa API. EdNet tải tại https://github.com/riiid/ednet (giấy phép CC BY-NC 4.0); nội dung Santa chỉ dùng cho mục đích nghiên cứu.

## Tái lập thực nghiệm

Xem `experiments/das3h-production/README.md`, `experiments/kt-benchmark/README.md` và `ednet_santa_mapping_clean/README.md`. Các lệnh cần dữ liệu EdNet KT4 đặt theo hướng dẫn trong từng README.

## Tài liệu khác

[Kiến trúc](docs/architecture.md), [tổng quan hệ thống](docs/system-overview.md), [triển khai](docs/deployment.md), [quản trị](docs/admin.md), [Listening](docs/listening.md), [Reading](docs/reading.md), [phòng thi](docs/exam-room.md), [lịch ôn HLR](docs/flashcard-hlr-retrieval.md), [gia sư AI](docs/contextual-ai-tutor.md).

## Email xác nhận

Khi đăng ký bằng email và khi đặt lại mật khẩu, hệ thống gửi mã 6 chữ số. Mã có hiệu lực 10 phút, dùng một lần; đăng nhập thông thường vẫn dùng email và mật khẩu.

- `.env.example` đã cấu hình sẵn Gmail SMTP (`smtp.gmail.com`, cổng 465, TLS) với tài khoản gửi `SMTP_USER`, chỉ để trống `SMTP_PASS` vì đây là thông tin bí mật.
- Để trống `SMTP_PASS`: mã được gửi vào hộp thư thử nghiệm Mailpit tại **http://localhost:8025**. Mọi chức năng vẫn hoạt động bình thường.
- Điền mật khẩu ứng dụng Gmail của `SMTP_USER` vào `SMTP_PASS` trong `.env`: mã được gửi tới hộp thư thật của email đăng ký. Máy chạy cần kết nối được tới `smtp.gmail.com:465`.

Sau khi sửa `.env`, chạy lại `docker compose up -d`.
