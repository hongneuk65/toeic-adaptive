# Phòng thi

## Cập nhật màu và phân bổ Listening ngày 18/10/2026

Phòng thi dùng cùng xanh thương hiệu `#0060fd`, màu chữ/nền/viền từ các biến `--ui-*` của ứng dụng; giữ ô đã trả lời xanh lá.

`node backend/prisma/measure-exam-audio.cjs` dùng ffprobe đo 1.577 audio độc lập và bổ sung `stimulus.audioDurationSeconds` cho 2.905 câu nghe. Cache ở storage/exam/durations.json. Importer giữ lại metadata này khi backfill.

API tạo lịch cho mỗi lượt đề: FULL = 2.700 giây; MINI tỷ lệ theo số câu nghe thực (51/100 × 2.700 = 1.377 giây). Audio dùng chung nhóm chỉ tính một lần. Phần còn lại được phân theo trọng số số câu trong nhóm, làm tròn mili giây theo tổng tích lũy để audio + nghỉ bằng chính xác ngân sách. Giữ tốc độ phát 1×. Nếu audio vượt ngân sách, từ chối đề thay vì tăng tốc. Chưa đo được audio của lượt cũ thì không khẳng định lịch 45 phút, chỉ nghỉ 5 giây/câu.

Ví dụ đề FULL trong integration: audio 1.240,990 giây + nghỉ 1.459,010 giây = 2.700 giây; nghỉ khoảng 14,59 giây/câu đơn và 43,77 giây/nhóm ba câu. Số thực tế thay đổi theo đề. Lịch không tính thời gian trì hoãn do mạng hoặc trình duyệt chặn autoplay, nên thời gian thực có thể dài hơn khi có gián đoạn.

Kết thúc audio vào trạng thái chọn đáp án, đếm ngược trước khi chuyển. Lưu `audioEnded` và deadline nghỉ riêng; refresh không phát lại audio, không cấp lại toàn bộ thời gian nghỉ. Chỉ đánh dấu nhóm hoàn tất khi hết nghỉ.

Phòng thi dùng bố cục hai cột bằng nhau, chiều cao viewport, thanh đồng hồ/nộp bài và footer cố định. Tư liệu và câu hỏi cuộn độc lập. App header và gia sư AI không xuất hiện trong phòng thi. Mobile vẫn giữ hai cột theo yêu cầu; bảng rộng chỉ cuộn trong khung bảng.

## Luồng làm bài

- Part 1: ảnh và bốn lựa chọn A–D; Part 2: ba lựa chọn A–C. Không hiển thị lời thoại, câu hỏi hoặc nội dung các lựa chọn. Backend cũng loại nội dung này khỏi response phòng thi; review sau nộp vẫn giữ nguyên dữ liệu gốc.
- Part 3–4: một lượt nghe cho một nhóm câu dùng chung audio, hiển thị toàn bộ câu trong nhóm cùng đồ thị/bảng nguồn nếu có.
- Audio tự phát, không hiện controls tua/dừng/phát lại. Hết audio mở nhóm kế tiếp ngay. Khi trình duyệt chặn autoplay, có một nút bắt đầu để cấp tương tác phát âm thanh; lỗi mạng cho phép kết nối lại tại checkpoint.
- Vị trí nghe, nhóm đã tới và trạng thái mở Reading được lưu monotonic theo attempt trong sessionStorage. Tải lại tab tiếp tục vị trí đang nghe, không quay về nhóm trước. Nếu browser chặn storage, chỉ còn bộ nhớ trong trang; đây là ràng buộc UI, không phải cơ chế proctoring phía server.
- Listening không có nút trước/tiếp hoặc palette. Chỉ trả lời câu thuộc nhóm hiện tại. Reading có trước/tiếp và palette: FULL 101–200; MINI theo thứ tự thực tế của đề; PART_5 101–130. Ô xanh là đã chọn, xám là chưa chọn; thêm nhãn aria và viền câu đang xem.

## Tư liệu nguồn

Migration `20261017165000_exam_stimulus` thêm `Question.stimulus` JSONB. Importer backfill cấu trúc từ raw Santa: tài liệu riêng, đoạn văn, bảng/hàng/ô, ô gộp, nhấn mạnh, hình và chỗ trống. Chỉ dùng cây dữ liệu allowlist, không render HTML nguồn.

`stimulus.questionPosition` và `blank.number` của Part 6 là số thứ tự trong nguồn. UI ánh xạ sang số câu của lượt thi (ví dụ 131–134), tô đúng chỗ trống đang làm. Đổi tài liệu đưa cột trái về đầu; chọn câu khác trong cùng nhóm giữ vị trí đọc. Bộ chọn đề mới giữ nguyên thứ tự câu nguồn trong mỗi nhóm thay vì thứ tự ID database. Các lượt thi đã lưu giữ nguyên membership.

Sau migration/generate, chạy importer lại để backfill; không đổi đáp án, điểm hoặc lịch sử học:

```powershell
npm run db:migrate --prefix backend
npm run db:generate --prefix backend
node backend/prisma/import-mapped-questions.cjs --apply
npm run build --prefix backend
```

Windows cần dừng backend đang giữ Prisma DLL trước khi generate và khởi động lại sau build.

## Kiểm chứng ngày 17/10/2026

- Backend: toàn bộ 144 test đạt sau ẩn transcript; sau sửa thứ tự nguồn, 32 test exam/group đạt. Sáu test importer đạt. Integration kiểm chứng 5.049 stimulus, giữ thống kê học, media và ba loại đề thật.
- Frontend: 47 test đạt (navigation, checkpoint, blank mapping và bảng nhiều tài liệu); scoped ESLint và build đạt. Reviewer React/accessibility không thấy blocker/major. Các góp ý focus palette, bảng rộng và reset scroll đã sửa. Checkpoint không bền qua refresh nếu browser chặn storage vẫn là giới hạn đã ghi trên.
- Browser: desktop 1440×900 đo hai cột 720px; tablet 768×1024 đo 384px; mobile 390×844 không tràn toàn trang, prose nằm trong cột, bảng cuộn nội bộ. Part 6 khớp blank 131–134; chọn câu 132 tô blank tương ứng và palette xanh. Part 7 giữ ba tài liệu và hai bảng.
- Audio thực Part 1: sau gesture ban đầu phát ở rate 1, không controls, tự chuyển câu 1→2→3; reload giữ cursor và checkpoint 4,16 giây của câu 3. Part 2 có đúng ba radio A/B/C; Listening không có nút quay lại/đi tiếp.

Harness Vite-only `frontend/test/exam-room.browser.html` dùng dữ liệu công khai local xuất bằng `node backend/test/export-exam-room-fixture.cjs` (fixture bị Git ignore). Harness không tạo attempt, đáp án hoặc điểm của người học; không được đưa vào entry build production. Nó dùng attempt ID âm riêng và có thể mở các nhóm nghe/Reading để kiểm thử mà không phải chờ toàn bài nghe.

## Chọn Part tùy ý

Thi thử hỗ trợ CUSTOM với một hoặc nhiều Part 1–7. Số câu theo đề chuẩn: 6/25/39/30/30/16/54; nhóm audio và tư liệu được giữ nguyên. Lựa chọn Part được lưu cùng lượt thi. Thời gian Reading cộng theo Part 5/6/7: 20/10/45 phút; Listening theo kế hoạch audio đã đo, tối thiểu 5 giây trả lời mỗi câu nếu audio dài hơn ngân sách tỷ lệ. Đề chỉ nghe có màn hình hoàn thành và nộp bài, tải lại không phát lại audio.

Kiểm tra: 184 test backend, 59 test frontend; custom-exam.integration.cjs tạo/tải lại/nộp thành công 7 Part riêng, tổ hợp 2+6+7 và cả 7 Part. Migration 20261018000000_custom_exam_parts đã áp dụng local; giữ nguyên lượt thi cũ.

## Chữa bài theo bố cục phòng thi

Trang review dùng cùng khung chia đôi cố định: tư liệu/ảnh/bảng/audio bên trái, nhóm câu hỏi và giải thích bên phải. Điều hướng tự do tất cả nhóm; bảng câu phân biệt đúng/sai/chưa trả lời và có bộ lọc câu cần xem lại. Audio có controls để nghe lại sau khi nộp. Công cụ bôi đen tra/lưu từ vẫn hoạt động.

API người học bỏ marker Santa/admin, footer Nguồn/mapping và ghi chú độ khó; giải mã HTML entities. Dữ liệu nguồn trong database và giao diện admin không bị sửa. Áp dụng cho chữa đề, quiz lý thuyết, Reading và phản hồi ôn thích ứng; RAG chỉ nhận lời giải giáo dục đã làm sạch.

Kiểm thử: 189 backend tests, 62 frontend tests đạt; tạo/nộp/chữa đủ7Part và các tổ hợp bằng API local, không còn metadata trong lời giải. Chưa xác minh hình ảnh trực tiếp: browser bị tắt trong Work settings.

## Server integrity and recovery

New attempts store a server deadline and a frozen question snapshot including grading keys. Public room responses use an explicit field allowlist; review and grading read the snapshot. The migration freezes legacy attempts using the bank content available at deployment; it cannot reconstruct older edits. ExamAnswer no longer has a foreign key to mutable Question, so deletion does not erase submitted review.

PATCH `/exam/:id/draft` accepts `{answers, revision}` where revision is the next expected revision. Concurrent stale saves receive HTTP 409. Saves after the server deadline are rejected. Submission received after the deadline grades only the last saved server draft, including unanswered items; late client payload edits are ignored. There is no late-edit grace period. Retrying submit returns the committed result, and GET of a submitted attempt exposes submittedAt for recovery navigation.

Exam results, answers, and MasteryOutbox rows commit atomically. A background poller processes up to 50 events per five seconds, retries failures with exponential backoff capped at one hour, and uses a stable event ID with ProcessedMasteryJob to avoid applying a retried observation twice. Pending rows and lastError support reconciliation, including a process restart or Redis outage. Rows remain retained for diagnostics.

Run isolated migration, concurrency, draft, deadline, snapshot/deletion, and durable outbox integration tests with `node backend/test/reliability.integration.cjs` after backend build and with DATABASE_URL set to a PostgreSQL database allowing temporary test schemas. All fixture schemas are randomly named and dropped in finally.
