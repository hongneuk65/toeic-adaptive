# Review repo — 18/10/2026

Review working tree hiện tại, gồm cả thay đổi chưa commit. Không chỉnh sửa mã ứng dụng. Đây là review tĩnh các luồng chính, schema, cấu hình triển khai và kiểm thử; không phải xác nhận đã đọc từng file dữ liệu raw, notebook hoặc kiểm thử toàn bộ màn hình bằng browser. Các báo cáo cũ chỉ dùng làm bối cảnh, không thay thế bằng chứng hiện tại.

P1: ảnh hưởng tính đúng đắn, mất dữ liệu hoặc vượt ranh giới bài thi. P2: ảnh hưởng trải nghiệm, hiệu năng hoặc khả năng bảo trì. Nhận xét thiết kế là đánh giá từ cấu trúc JSX/CSS, chưa xác minh trực quan trên thiết bị.

## P1 — Xử lý và tính đúng đắn

### 1. API giải thích cho phép xem đáp án trước khi nộp thi

`backend/src/rag/rag-explainer.service.ts:58` nhận questionId rồi lấy câu hỏi; kết quả tại dòng 200 trả correctAnswer. Controller chỉ kiểm tra JWT/role USER, không kiểm tra lượt thi đã nộp. `rag-chat.service.ts:126` cũng đưa đáp án đúng vào ngữ cảnh AI. Ẩn nút AI trong phòng thi không ngăn gọi API từ client khác.

Sửa: gắn yêu cầu giải thích với nguồn/lượt làm và kiểm tra trạng thái ở server. Trước khi nộp, chỉ cho gợi ý đã loại bỏ đáp án; kiểm thử cả endpoint thường và streaming.

### 2. Server không thực thi hạn nộp bài

`backend/src/exam/exam.service.ts:92` chỉ kiểm tra submittedAt và danh sách câu hỏi. Thời hạn được tính bằng Date.now() tại `frontend/src/lib/exam-session.ts:5`. Thay đổi giờ máy hoặc gọi submit trực tiếp sau hạn vẫn vượt được quy tắc UI.

Sửa: lưu deadline/duration tại lúc tạo lượt thi, dùng giờ server và định nghĩa rõ chính sách mất mạng/hạn nộp.

### 3. Kết quả thi và cập nhật mastery không bền vững cùng nhau

`exam.service.ts:127` commit kết quả trước khi enqueue ở dòng 139. `queue/mastery-queue.service.ts:62` bắt lỗi enqueue rồi chỉ ghi log; caller không biết enqueue thất bại. Redis lỗi hoặc process dừng giữa hai bước có thể để bài đã nộp nhưng thiếu lịch sử kỹ năng.

Sửa: transactional outbox, worker retry theo event ID ổn định và công cụ đối soát. Chỉ thêm catch ở caller không giải quyết được cửa sổ mất dữ liệu này.

### 4. Nộp bài chưa có cơ chế phục hồi khi mất phản hồi

`frontend/src/pages/ExamRoomPage.tsx:127` gửi bài; nếu server đã commit nhưng kết nối đứt trước khi response về, UI báo chưa nộp và yêu cầu thử lại. Lần sau `exam.service.ts:101` từ chối do đã nộp. Reload cũng gọi getExam, vốn từ chối lượt đã nộp, nên người học bị kẹt ở trang báo lỗi dù kết quả có thể còn trong lịch sử.

Sửa: submit idempotent trả lại kết quả cũ cho cùng lượt/payload; bổ sung endpoint trạng thái và điều hướng sang review khi đã nộp.

### 5. Đề cũ phụ thuộc dữ liệu câu hỏi hiện tại

`backend/prisma/schema.prisma:150` lưu questionIds thay vì snapshot/version. `exam.service.ts:105` lấy correctAnswer hiện tại khi chấm; getReview cũng lấy question hiện tại. Admin sửa câu hỏi sau khi bắt đầu thi có thể làm nội dung và đáp án dùng chấm khác thứ người học đã thấy. Xóa câu hỏi còn khiến lượt đang làm không thể tiếp tục.

Sửa: version câu hỏi bất biến hoặc snapshot đầy đủ tại lúc tạo đề; lưu version được dùng chấm và hiển thị review.

### 6. Nộp lại cùng câu có thể tăng mastery nhiều lần

`das3h.service.ts:128` gọi recordAndSync không có jobId/eventId. `theory.service.ts:45` luôn lấy tối đa năm câu đầu và submitQuiz không có thực thể quiz attempt; mỗi lần submit lại enqueue job UUID mới. Chống double-click ở UI và processedMasteryJob chỉ chống một phần retry worker, không chống request HTTP lặp.

Sửa: định danh lượt luyện và lần trả lời, unique constraint/idempotency key; phân biệt học lại chủ động với retry vận chuyển.

## P2 — Cá nhân hóa và nội dung học

### 7. Mastery hiển thị không giảm theo thời gian

`mastery/mastery.service.ts:35` đọc masteryScore đã lưu; `das3h.service.ts:72` chỉ cập nhật các skill của câu vừa làm. Trong khi calculateHTheta phụ thuộc thời gian và ability là tham số chung, các skill khác hoặc người học nghỉ nhiều tuần vẫn giữ snapshot cũ trên trang gợi ý. Scheduler tính mới có thể không đồng nhất với UI.

Sửa: tính profile theo thời điểm hiện tại bằng batch, hoặc cache có thời hạn; biểu diễn riêng kỹ năng chưa đủ bằng chứng thay vì chỉ gán 0.5.

### 8. Chọn câu thích ứng chỉ xét một tập nhỏ và công thức khác lúc chấm

`adaptive-scheduler.service.ts:41` take 50 không có chiến lược lấy mẫu phủ ngân hàng; exploration chỉ diễn ra trong tập đó. `das3h.service.ts:249` evaluateCandidatesForSkill dùng một skill mục tiêu, còn predictProbCorrect tổng hợp các skill của câu. Câu nhiều kỹ năng có thể được xếp hạng bằng xác suất khác xác suất dùng trong SGD.

Sửa: lấy mẫu phân tầng độ khó/kỹ năng và dùng cùng quy tắc tổng hợp đa kỹ năng; đo độ phủ câu, độ lặp và calibration trước khi tăng độ phức tạp.

### 9. Luyện thích ứng thiếu renderer tư liệu cấu trúc

`frontend/src/components/AdaptivePracticeModal.tsx:112` hiển thị passage, imageUrl, audioUrl và text, nhưng không dùng ExamStimulus. `frontend/src/types/mastery.ts:27` cũng không mô tả stimulus. Câu Part 6/7 có bảng, nhiều tài liệu hoặc chỗ trống cấu trúc có thể mất ngữ cảnh cần thiết. Part 1/2 cũng chưa áp dụng cùng quy tắc ẩn transcript như phòng thi.

Sửa: dùng chung renderer và chính sách hiển thị theo loại câu; nếu chủ đích là bài có hỗ trợ transcript thì ghi rõ chế độ để người học hiểu.

## P2 — UI/UX

### 10. Trang chủ ưu tiên giới thiệu hơn tiếp tục học

`DashboardPage.tsx:60` đặt hero và CTA Khám phá ngay trước HomeProgress; `prep-home.css:183` đặt hero cao tối thiểu một viewport. Người đã đăng nhập phải cuộn qua phần giới thiệu để thấy bài đang học. Resumes còn chưa có đề thi dở.

Sửa: đưa bài đang học, một hành động tiếp tục chính và tiến độ gần đây lên đầu; dùng phần giới thiệu cho người mới hoặc trang công khai.

### 11. Nhãn tự lưu bài thi vượt quá mức bảo đảm thực tế

`lib/exam-session.ts:29` chỉ lưu đáp án vào sessionStorage; schema không lưu draft answer trước submit. `ExamRoomPage.tsx:208` luôn ghi Đáp án tự lưu, kể cả khi lưu local thất bại và phía trên đang có cảnh báo. Đóng tab/mở trên thiết bị khác không có bảo đảm phục hồi.

Sửa: autosave server có revision, chỉ báo Đã lưu khi server xác nhận; nếu giữ local thì ghi rõ phạm vi lưu và điều kiện mất tiến độ.

### 12. Thống kê trên trang chủ lấy số phần tử bị giới hạn

`DashboardPage.tsx:71` dùng listening.sessions.length và số reading attempts đã nộp. Catalog Listening chỉ trả 30 sessions (`listening.service.ts:49`); Reading chỉ trả 100 attempts (`reading.service.ts:120`). Nhãn thống kê không nêu giới hạn, nên tổng có thể đứng yên dù người học làm thêm.

Sửa: API aggregate/count riêng hoặc đổi nhãn thành lịch sử gần đây với phạm vi rõ ràng.

### 13. Hết phiên đăng nhập làm đứt luồng học

`lib/api.ts:8` chuyển mọi lỗi HTTP thành Error text, mất status; không có xử lý chung cho 401. AuthContext xác minh khi khởi tạo/đổi token, không tự phục hồi khi token hết hạn trong phiên. ProtectedRoute chuyển sang login không lưu URL đích và LoginPage luôn về dashboard/admin.

Sửa: ApiError giữ status, điều phối hết phiên ở một nơi, bảo toàn bản nháp và returnTo nội bộ hợp lệ.

### 14. Flashcard ghi nhận nhớ/quên nhưng chưa hỗ trợ lịch ôn

`flashcard.service.ts:111` chỉ lưu known và reviewCount. Trang học lọc theo từ/nghĩa, chưa có hàng đợi đến hạn, ưu tiên thẻ cần ôn hoặc tiến độ buổi học. Đây là thiếu sót sản phẩm, không phải lỗi chấm điểm.

Sửa: trước hết thêm bộ lọc Cần ôn/Đã nhớ và buổi học hữu hạn; sau đó mới thêm dueAt và thuật toán lặp lại ngắt quãng.

## P2 — Vận hành, hiệu năng, kiểm thử

### 15. Chưa giới hạn tốc độ ở các endpoint tốn tài nguyên

Không thấy throttle/limiter trong `backend/src/main.ts`, AuthController, RagController hoặc Nginx được lưu trong repo. RAG có JWT và giới hạn body nhưng chưa có quota chung như Reading. Đăng nhập/đăng ký liên tục gây tải bcrypt; chat liên tục gây tải hoặc chi phí AI. Giới hạn ở nền tảng triển khai ngoài repo chưa được xác minh.

Sửa: giới hạn theo user/IP phù hợp endpoint, quota token/cost và concurrent request cho AI; trả 429 kèm thông tin thử lại.

### 16. CI chưa chạy phần lớn kiểm thử tích hợp và luồng browser

`.github/workflows/ci.yml` chỉ chạy npm run check và build Docker. Root test chạy Jest và các file Node test frontend được liệt kê; các script test/*.integration.cjs và entry exam-room.browser.tsx không tự được thực thi bởi lệnh đó. Vì vậy check xanh chưa chứng minh autosave, mất mạng, nhập dữ liệu thật, role guard và hành vi bàn phím xuyên các màn hoạt động cùng nhau.

Sửa: CI PostgreSQL/Redis với fixture độc lập, integration cho các luồng chính và browser smoke desktop/mobile; bổ sung hồi quy cho các P1 nêu trên.

### 17. Các route học được import đồng bộ và CSS nhiều lớp override

`frontend/src/App.tsx` chỉ lazy-load AdminPage; các màn Reading, Listening, thi và AI đều được import trực tiếp. `prep-home.css` định nghĩa lại hero ở nhiều đoạn, trong khi study-shell và CSS từng trang tiếp tục override style chung. Đây là rủi ro dung lượng tải đầu và khó dự đoán regression, chưa phải số đo tốc độ thiết bị.

Sửa: chia chunk theo route, đo build; hợp nhất token và bỏ style bị ghi đè sau khi xác minh screenshot các màn chính.

### 18. Phòng thi mobile giữ hai cột và giảm chữ xuống rất nhỏ

`frontend/src/styles/exam-room.css:18` đặt hai cột bằng nhau. Media query ở dòng 93 giảm padding và font nhưng không đổi cấu trúc cột; nhãn xuống 8–10px, lựa chọn 12px và nút nộp cao tối thiểu 34px. Trên màn hình khoảng 390px, mỗi vùng nội dung chỉ còn khoảng nửa chiều rộng trước khi trừ padding, đặc biệt bất lợi cho đoạn Reading dài/bảng. Đây là rủi ro suy ra từ CSS, cần xác minh trên browser/điện thoại thật.

Sửa: thử giao diện mobile một cột hoặc chuyển Tư liệu/Câu hỏi bằng tab có giữ vị trí, tăng kích thước chữ và vùng chạm; so sánh thao tác đọc–trả lời với bố cục hiện tại trước khi chốt.

## Thứ tự đề xuất

1. Khóa rò đáp án, hạn thi server và snapshot/version đề.
2. Submit idempotent, lưu nháp server, outbox mastery.
3. Đồng nhất công thức mastery/scheduler và renderer câu hỏi.
4. Đưa tiếp tục học lên đầu, sửa nhãn thống kê/tự lưu và phục hồi đăng nhập.
5. Bổ sung integration/browser CI, quota AI và đo hiệu năng.

Không dùng kết quả benchmark DAS3H/GRU trong experiments để mặc định chứng minh scheduler production tốt: README benchmark đã ghi rõ mô hình, protocol và mục tiêu đánh giá khác production.

## Kiểm tra thực hiện trong lượt review

- `npm run check`: thành công (exit 0).
- Lint backend/frontend: qua.
- Jest backend: 42 suites, 191 tests qua.
- Frontend Node tests: 62 tests qua.
- Production build backend/frontend: qua.
- Build frontend cảnh báo chunk >500 kB: entry JS 654.82 kB (gzip 192.59 kB), Three.js 533.15 kB (gzip 132.50 kB); entry CSS 132.10 kB (gzip 26.15 kB). Three.js đã là dynamic import, không nên coi toàn bộ dung lượng đó là tải đồng bộ ban đầu.
- Chưa chạy DB integration, browser E2E, screen reader, kiểm thử điện thoại thật hoặc live AI trong lượt này. Test qua không phủ định các vấn đề chưa có regression test.
- Kết luận review: cần sửa; bằng chứng xác minh một phần (code và checks hiện có), chưa xác minh toàn bộ runtime/UI.
