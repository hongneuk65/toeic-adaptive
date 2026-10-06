# Reading

Reading có dữ liệu và kết quả riêng, không cập nhật DAS3H hoặc sửa trọng số. Listening giữ module/API hiện có.

## Cài đặt

Dùng Node 24, PostgreSQL và Redis theo cấu hình đang có. Từ thư mục backend:

```powershell
npm run db:generate
npm run db:migrate
npm run seed:reading
npm run build
npm run start:prod
```

Migration `20261006040000_reading` thêm ReadingArticle, ReadingVersion, ReadingAttempt, ReadingReport, ReadingAiEvent, FlashcardReview và mở rộng flashcard/folder. Không reset database. Seed tạo 25 bài tự biên soạn/125 câu hỏi; chạy lại giữ bài giống hệt, thay nội dung bằng phiên bản mới để giữ lịch sử.

Frontend: `VITE_API_URL=/api`, `npm run dev`, mở `/reading`. Proxy dev tới backend 3000. Redis cần hoạt động cho queue/hạn mức; bài thư viện đọc/làm/chấm/lưu được khi AI không hoạt động.

## Cấu hình

Các mặc định trong `backend/.env.example`:

- `READING_MAX_TEXT_CHARS=10000`: văn bản mới, khoảng 1000–20000 ký tự.
- `READING_MAX_QUESTIONS=5`: tối đa câu AI/bản nháp mới, khoảng 2–8. Dưới 90 từ tạo tối đa 3 câu, dưới 40 từ bị từ chối.
- `READING_GENERATIONS_PER_DAY=5`: lượt tạo/thử lại/AI draft mỗi tài khoản, 1–30.
- `READING_TUTOR_PER_DAY=30`: lượt hỗ trợ mỗi tài khoản, 1–100; gồm gợi ý an toàn trước nộp.
- `READING_TUTOR_MAX_CONTEXT_CHARS=12000`: trần ngữ cảnh JSON gia sư, 2000–30000. Vượt trần sẽ báo lỗi, giữ tiến độ, không cắt mất thông tin để đoán đáp án.
- `READING_AI_TIMEOUT_MS=45000`: 1000–90000 ms.

Hạn mức theo ngày UTC, đếm Redis nguyên tử. Mỗi bài thử tạo tối đa 3 lần, chống tạo trùng văn bản của cùng người. Queue xử lý một bài cùng lúc, lưu kết quả và không gọi lại khi mở bài. Dùng RagLlmService với khóa/model hiện có; không thêm dịch vụ trả phí bắt buộc. Reading tắt fallback lời giải chung để không giả lập câu hỏi JSON khi AI lỗi.

## Demo người học

1. Reading → lọc chủ đề/độ khó/loại/tiến độ/nguồn → chọn Training room change.
2. Đọc ý chính và trả lời câu đầu, rồi làm chi tiết/suy luận/mục đích/paraphrase. Đổi cỡ chữ khi cần.
3. Bôi chọn đoạn trong bài, chọn đáp án, bấm Dùng đoạn đang chọn. Chỉ câu ghi rõ yêu cầu mới cần bằng chứng. Nút dùng phần đang bôi chọn giúp lấy lại Selection trên điện thoại.
4. Lưu hoặc tải lại để tiếp tục. Tự lưu sau thay đổi, định kỳ và khi rời trang; mất kết nối hiện chưa lưu được.
5. Nộp đủ câu để xem đúng/tổng, lời giải Markdown và bằng chứng mẫu tô trong bài. Bằng chứng lưu riêng, không cộng/trừ điểm, không quy đổi TOEIC. Làm lại tạo lần mới, lịch sử gắn phiên bản.
6. Chọn từ/cụm từ → AI giải nghĩa/cấu trúc khi yêu cầu → nhập/chỉnh nghĩa/ghi chú → lưu. Flashcard → Từ vựng Reading có câu gốc, nguồn và Cần ôn/Đã nhớ. Thẻ/tiến độ riêng; lưu lại cùng từ/câu/phiên bản cập nhật nghĩa, không tạo trùng.
7. Dán tiếng Anh trong Tạo bài từ văn bản của bạn. Bài giữ nguyên văn bản gốc, có trạng thái tạo/thành công/thất bại/thử lại. Bài AI chưa duyệt chỉ luyện tập. Có báo câu hỏi mơ hồ/đáp án sai.

Trước nộp, gợi ý/ghi nhận bằng chứng dùng quy tắc an toàn, không gọi LLM hoặc gửi đáp án ẩn. AI giải nghĩa/cấu trúc trước nộp chỉ nhận bài và đoạn chọn, không có câu hỏi/lựa chọn/khóa đáp án hoặc lịch sử. Sau nộp mới gửi câu hỏi và lời giải để giải thích đáp án/paraphrase. Nhận xét bằng chứng ghi là tham khảo.

## Demo admin

Đăng nhập ADMIN hiện có; quản trị ngay tại Reading. Tạo/mở bài hệ thống, sửa văn bản/chủ đề/loại/mức độ và JSON câu hỏi, hoặc dùng AI hỗ trợ draft. Xem trước lựa chọn, đáp án, lời giải, bằng chứng. Lưu tạo phiên bản mới; duyệt đúng phiên bản rồi xuất bản. API chặn xuất bản chưa duyệt. Bản nháp sửa bài công khai không thay nội dung học viên đang thấy đến khi xuất bản lại. Archive ẩn bài nhưng giữ lịch sử.

JSON câu hỏi: `type` MAIN/DETAIL/INFERENCE/PURPOSE/PARAPHRASE, `prompt`, bốn `options` khác nhau, `answer` chỉ số 0–3, `explanation`, `evidenceRequired` boolean, `evidence` gồm `{start,end,text}`. Câu đầu MAIN, không trùng câu hỏi; bằng chứng khớp văn bản tại vị trí UTF-16. AI thiếu offset đúng chỉ được tìm lại trích dẫn xuất hiện duy nhất.

Admin xem báo lỗi, metadata lỗi tạo bài và sử dụng AI 24 giờ (lượt/ký tự/thời gian, không phải hóa đơn/token chính xác). Không có quyền mặc định đọc bài, bài làm hoặc từ vựng cá nhân; lỗi bài riêng không gửi nội dung/tên bài cho admin.

## Kiểm thử

```powershell
# backend: API, PostgreSQL, Redis chạy; đã migrate/seed
npm run build
npm run lint
npm test -- --runInBand
npm run test:reading:integration
# tùy chọn gọi provider thật, tiêu thụ hạn mức hiện có
$env:READING_TEST_LIVE_AI='1'
npm run test:reading:integration
# frontend
npm run build
npm run lint
npm test
```

Integration tạo/dọn fixture riêng, bao phủ 25 bài/125 câu, input rỗng/ngắn/dài, cấu trúc/bằng chứng sai, đáp án ẩn, worker thành công/thất bại, ownership/admin, Redis quota, start đồng thời, ý chính trước, lưu/tiếp tục, chấm độc lập bằng chứng, nộp lặp, làm lại, phiên bản/archive lịch sử, lưu từ trùng/ôn riêng, báo lỗi. Live test chấp nhận đầu ra hợp lệ hoặc thất bại provider được xử lý đúng; không coi lỗi dịch vụ là tạo bài thành công.

Kiểm tra 06/10/2026: 24 suite/103 test backend, 27 test frontend; build/type-check/lint qua. Integration Reading qua. Trình duyệt kiểm tra trọn bài hệ thống, tiến độ qua reload, chọn bằng chứng, lưu từ, ôn bền vững. Một lần gọi provider thật trả 3 câu hợp lệ; các lần sau gặp lỗi stream provider, được đưa về FAILED và giữ văn bản gốc. Vite cảnh báo bundle JS trên 500 kB, không chặn build.

## Giới hạn

Cấu trúc/bằng chứng hợp lệ không xác minh hoàn toàn chất lượng câu hỏi, suy luận, tính duy nhất về ngữ nghĩa hay độ khó. Bộ mẫu phục vụ demo; phương án nhiễu/mức độ cần tiếp tục biên tập cho ngân hàng chính thức. Duyệt admin là kiểm tra của người biên soạn, không phải kiểm định tâm trắc.

AI phụ thuộc mạng/hạn mức. Che email/số điện thoại không phải khử định danh đầy đủ; không dán thông tin riêng không cần thiết. Selection cảm ứng còn tùy thiết bị, đã kiểm tra bố cục điện thoại trong browser nhưng chưa mọi máy thật. Chưa lấy bài từ link báo, chưa hiệu chuẩn độ khó, không dùng AI cho đánh giá năng lực/DAS3H.
