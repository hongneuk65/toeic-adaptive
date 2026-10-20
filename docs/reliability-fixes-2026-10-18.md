# Hoàn thiện sau review — 18/10/2026

## Phạm vi

Sửa các vấn đề của `repo-review-2026-10-18.md`, trừ trang chủ theo yêu cầu. Giữ nguyên nội dung, layout, CSS và các component của trang chủ; hash của các file đó khớp bản ghi trước khi sửa. Không commit/push hay triển khai production.

## Bài thi và dữ liệu học

- Server lưu deadline, snapshot nội dung/đáp án/skill/độ khó và bản nháp có revision. Admin sửa hoặc xóa câu trong ngân hàng không đổi đề đã tạo hay bài chữa.
- GET bài đã nộp trả trạng thái để mở review. Submit trả lại kết quả đã lưu khi retry; hai request nộp đồng thời không tạo hai kết quả.
- Sau deadline, server khóa sửa và chấm bản nháp đã nhận trước hạn; đáp án mới trong payload nộp muộn không được dùng. UI hiển thị chính sách này.
- Bản nháp local có revision cơ sở. Tab cũ không tự ghi đè bản server mới; PATCH mất phản hồi được đối soát GET; xung đột có hành động tải bản máy chủ rõ ràng.
- Kết quả thi/quiz và sự kiện cập nhật kỹ năng được ghi cùng transaction. Worker outbox xử lý theo người dùng, có retry/backoff, chống áp dụng lặp và giữ thời điểm xảy ra cùng độ khó đã chốt. Câu nguồn bị xóa không xóa lịch sử hoặc làm retry vĩnh viễn.
- Adaptive/quiz dùng attempt UUID và receipt bền vững; retry cùng payload trả lại kết quả, payload khác bị từ chối.

## Cá nhân hóa, giao diện và xác thực

- Profile, roadmap và giải thích AI dùng mastery tính tại thời điểm hiện tại. Trường `evidenceStatus` phân biệt kỹ năng đã luyện và chưa đủ dữ liệu; không dùng 0.5 để khẳng định trình độ người mới.
- Scheduler lấy mẫu phủ các mức độ khó, rồi tính đa kỹ năng cùng quy tắc với dự đoán SGD.
- Luyện thích ứng dùng renderer tài liệu cấu trúc; Part 1/2 ẩn transcript và Part 2 chỉ có ba phương án.
- Phòng thi/chữa bài mobile chuyển một cột; chữ đọc và lựa chọn lớn hơn, vùng chạm chính tối thiểu 44px, bảng có cuộn ngang trong vùng riêng. Phần hướng dẫn Part 5 thu gọn trên mobile.
- Flashcard có lọc đến hạn/cần ôn/đã nhớ/tất cả và buổi học hữu hạn. Nhớ tốt giãn lịch 1/3/7/14/30 ngày; quên hẹn 10 phút. Hiển thị lần ôn tiếp; retry cùng đánh giá trong một phút không nhân lượt ôn.
- HTTP error giữ status; 401 xóa đúng token hết hạn, giữ URL bài, đăng nhập lại quay về bài. Đồng bộ thay đổi token giữa tab. URL quay lại được giới hạn trong ứng dụng.
- Các route học tải riêng; error boundary cho route học/admin. Entry JS từ 654.82 xuống khoảng 458.28 kB, gzip từ 192.59 xuống 143.56 kB (số đo build local).

## API và triển khai

- Endpoint giải thích/chấm câu hỏi kiểm tra bài thi đang còn hạn; không thể lấy đáp án chỉ bằng cách gọi endpoint khác trong lúc thi. Snapshot công khai lọc cả JSON stimulus lồng nhau. Bài hết hạn không khóa học vô hạn: submit muộn chỉ chấm bản nháp cũ.
- Redis giới hạn đăng nhập/đăng ký theo IP (20/phút), AI theo user (100/24h), tối đa hai yêu cầu AI đồng thời; trả Retry-After và 429. Redis lỗi trả 503 cho endpoint cần budget. Reading/Listening giữ quota riêng đang có.
- `TRUST_PROXY=1` chỉ khi sau một reverse proxy tin cậy; Compose bật theo topology của repo. Đầu vào AI được giới hạn độ dài.
- Hai migration `20261018090000_exam_integrity` và `20261018100000_flashcard_schedule` đã chạy local. Snapshot đề cũ chỉ phản ánh dữ liệu còn tồn tại lúc migration; không thể khôi phục nội dung đã sửa từ trước.
- Backend local Redis đã đổi từ cổng 6380 không hoạt động sang listener 6379; không đổi thông tin đăng nhập/khóa AI.

## Kiểm chứng

- `npm run check`: lint, backend/frontend tests và production build qua.
- Backend: 48 suites, 215 tests qua, gồm hồi quy cold-start RAG và wiring module guard.
- Frontend: 65 Node tests qua.
- Playwright: 10 tests qua trên Chromium desktop 1440×900 và mobile Pixel 7: autosave, mất response PATCH/submit, reload, xung đột revision, hết token rồi quay lại bài, lật thẻ bằng bàn phím, lọc lịch ôn, tài liệu Reading có bảng. API ở các test browser được mock có trạng thái để tái hiện lỗi mạng ổn định.
- `backend/test/reliability.integration.cjs`: PostgreSQL thật, schema ngẫu nhiên; fresh/legacy migration, snapshot edit/delete, deadline, concurrency, rollback, outbox retry và khóa user đều qua.
- `backend/test/http-reliability.integration.cjs`: Nest HTTP + PostgreSQL + Redis thật, mock riêng LLM; JWT/role/ownership, DTO, draft/retry/deadline, RAG boundary, lịch flashcard và quota đều qua. Schema/Redis namespace test được dọn sau khi chạy.
- CI đã bổ sung PostgreSQL/Redis services, hai integration suite và Playwright; lưu bằng chứng browser khi thất bại.
- Backend đầy đủ khởi động thành công sau migration; `/health/ready` trả `{"status":"ok"}`. Đã dừng server kiểm tra cổng 3001 sau khi xác minh.
- Đã xem ảnh render mobile phòng thi/chữa bài/flashcard; không xác nhận toàn bộ trình duyệt, screen reader hoặc micro điện thoại thật.

## Giới hạn giữ rõ

- Trang chủ (đề xuất 10 và thống kê trang chủ ở đề xuất 12) giữ nguyên theo yêu cầu. Không thay đổi hiệu ứng Three.js của trang chủ; chunk tải riêng của nó vẫn khoảng 533 kB và còn cảnh báo build.
- Không viết lại toàn bộ CSS hoặc nâng Tailwind 3 lên 4 vì ảnh hưởng trang chủ. Đã vá dependency tương thích; npm audit còn cảnh báo trong chuỗi công cụ build Tailwind 3. Không dùng `audit fix --force` để thay đổi giao diện ngoài phạm vi.
- Không gọi API AI trả phí để thử nội dung trong lượt này. Test provider/streaming dùng mock; HTTP test chỉ mock LLM.
- Thứ tự outbox được bảo đảm giữa các sự kiện pending của một user. Chưa replay lại toàn bộ SGD nếu người học có lượt luyện đồng bộ chen vào lúc sự kiện cũ đang chờ xử lý; timestamp lịch sử vẫn được giữ đúng.
- Ba nhánh implementation/review frontend, exam và learning đã chạy. Các vòng kiểm tra cuối được agent chính tiếp tục; không yêu cầu thêm kết nối plugin ngoài repo.
