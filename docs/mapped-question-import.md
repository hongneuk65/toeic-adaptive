# Nhập câu hỏi Santa × EdNet vào ngân hàng câu hỏi

Nguồn: `ednet_santa_mapping_clean/outputs/normalized_santa.json`, `matched_questions.json`, `ednet_with_own_tags.json` và raw Santa trong cùng thư mục. Không dùng `data/DE_THI.txt`.

Hỗ trợ cả 7 Part. Part 5 giữ phạm vi 733 câu nối EdNet của đợt đầu; các Part còn lại nhận cả câu Santa chưa nối EdNet nếu có nội dung/đáp án/media hợp lệ. Không tự gán ID hoặc tag EdNet cho câu Santa-only.

Media lấy từ bản đã tải sẵn trong thư mục `santa_crawler` bên cạnh repository. Có thể đặt `SANTA_CRAWLER_DIR` để đổi vị trí. Importer chỉ đọc media manifest, resource index và file đã tải; không đọc token hoặc gọi API nguồn. Kiểm tra SHA256 trước khi sao chép vào `backend/storage/exam` (đã Git ignore). Cần khoảng 690 MB cho đợt này.

Chạy từ thư mục gốc:

```powershell
node backend/prisma/import-mapped-questions.cjs
node --test backend/test/mapped-import.test.cjs
node backend/prisma/import-mapped-questions.cjs --apply
npm run build --prefix backend
node backend/test/mapped-import.integration.cjs
# Chỉ nhập một số Part nếu cần:
node backend/prisma/import-mapped-questions.cjs --parts=1,2,3,4,6,7 --apply
```

Lệnh đầu chỉ kiểm tra nguồn. `--apply` ghi vào DATABASE_URL của môi trường; nếu chưa đặt sẽ đọc `backend/.env`. Cần database đã migrate và có các skill từ seed:skills. Không chạy seed demo vì dữ liệu đó là câu tổng hợp.

Importer phục hồi blank từ rich text raw, đối chiếu Part/đáp án và lựa chọn với nguồn. Part 2 có ba đáp án (optionD rỗng); các giao diện câu hỏi bỏ lựa chọn rỗng. Part 3–4 dùng audio của passage thay vì audio đọc riêng câu hỏi. Passage của các câu cùng nhóm giữ nguyên; Part 6 đánh số chỗ trống theo thứ tự nguồn và câu hỏi trỏ đúng số đó.

Liên kết kỹ năng ứng dụng qua adapter metadata/stem minh bạch. Đây là heuristic chưa được duyệt độc lập. OWN IDs và EdNet tags giữ trong phần nguồn của explanation; không coi OWN là bộ trọng số DAS3H đã hiệu chỉnh. Nhãn OWN vẫn là candidate, chưa semantic validated.

Controller `/exam/media/:name` phục vụ file có tên SHA256 và đuôi audio/ảnh được cho phép, hỗ trợ HTTP Range. Frontend gọi qua `/api/exam/media/...`. Storage nằm ngoài `dist`; khi deploy phải sao chép/mount storage cùng database. Restart backend đang chạy ở chế độ production sau khi build để có route mới.

Mỗi câu có marker `[santa-ednet:qID]`; transaction và advisory lock chống trùng giữa các lần chạy importer này. Câu đã nhập được bỏ qua, không sửa lịch sử hay thống kê học. Marker dùng schema hiện tại, không cần migration. Cần giữ marker khi sửa lời giải qua admin để duy trì chống trùng.

Câu nhập xuất hiện trong ngân hàng câu hỏi admin và có thể dùng cho các luồng chọn theo skill. Bộ tạo đề hiện chọn ID tăng dần nên các câu tổng hợp cũ có thể vẫn xuất hiện trước; importer không xóa hoặc thay thế câu cũ, cũng chưa tạo đề Santa nguyên bộ. Nếu chọn từng câu riêng lẻ, passage vẫn chứa đầy đủ ngữ cảnh nhóm. Độ khó MEDIUM và delta mặc định theo Part chỉ là khởi tạo.

Kiểm thử mock kiểm tra chống trùng; chỉ kết quả `--apply` thành công mới xác nhận đã ghi database thật.

## Lần nhập local ngày 17/10/2026

Đã chạy `--apply` thành công vào PostgreSQL local theo `backend/.env`: 716 câu, ID 310–1025. Chạy lại trả về `created: 0`, `skipped: 716`, `verified: 716`. Ba kiểm thử importer đều đạt. Dùng PostgreSQL đang chạy trực tiếp trên Windows; Docker Desktop không khởi động thành công và không cần cho lần nhập này.

Lần mở rộng thêm 4.333 câu (ID 1026–5358), giữ 716 câu cũ, xác nhận tổng 5.049 câu:

- Part 1: 300; Part 2: 613; Part 3: 1.008; Part 4: 984.
- Part 5: 716; Part 6: 792; Part 7: 636.
- 1.910 file audio/ảnh, 689.485.479 byte, dùng đường dẫn local của ứng dụng.
- Bỏ qua 42 câu thiếu ảnh hoặc cần bố cục nhiều ảnh, 17 câu Part 5 thiếu adapter kỹ năng. Ngoài phạm vi Part 5 matched-only còn 362 câu Santa-only chưa nhập.

Năm kiểm thử importer đạt. Integration đối chiếu mọi trường câu hỏi/đáp án/passage/skill trong PostgreSQL với nguồn, kiểm tra audio Range cho cả 4 Part nghe, ảnh Part 1 và từ chối tên file sai. Backend lint/build và frontend scoped ESLint/build đạt; frontend có cảnh báo bundle lớn đã có trước. Sửa ba lựa chọn Part 2 được agent frontend kiểm tra mã; chưa kiểm tra bằng trình duyệt.

Chạy lặp trong integration với đủ 5.049 câu: `created: 0`, `skipped: 5049`; tổng bản ghi và tổng `totalAttempts`/`totalCorrect` không đổi.

## Nối dữ liệu vào các luồng học

Ngân hàng Question và thư viện Reading/Listening/Flashcards/Theory là các bảng riêng. Chỉ chạy importer câu hỏi không làm các thư viện có nội dung. Để nhập phần thư viện từ raw:

```powershell
node backend/prisma/import-learning-content.cjs
node backend/prisma/import-learning-content.cjs --apply
npm run build --prefix backend
node backend/test/real-learning-data.integration.cjs
```

Đã nhập local: 171 bài Part 7 với câu hỏi/đáp án nguồn, 1.577 nguồn audio, 854 từ vựng có nghĩa/phiên âm/ví dụ và 101 bài lý thuyết. Folder từ vựng dùng tài khoản admin hiện có làm chủ sở hữu, public để người học mở được; không tạo tài khoản hoặc đổi credential. Reading giữ `reviewed: false`, `origin: CRAWL`, không tạo evidence giả hoặc ép câu nguồn thành dạng MAIN. Các bài nguồn này không yêu cầu chọn bằng chứng; lời giải/đáp án chỉ mở sau khi nộp. Listening phát audio thật; bài nghe chép chính tả vẫn cần transcript có thời gian thực, importer không tạo timing giả. Import lặp không tạo thêm bản ghi.

Thi thử mới chỉ lấy marker nguồn crawl; giữ nguyên nhóm hội thoại/đoạn văn, chọn ngẫu nhiên các nhóm và đủ quota. MINI dùng 21 câu Part 3 và 26 câu Part 7 (tổng 100 câu) để không cắt nhóm hội thoại 3 câu. Đề cũ đã lưu giữ nguyên. API `/exam/catalog` trả số câu thực và mức sẵn sàng; màn hình thi thử đọc API này. Theory quiz và adaptive practice cũng chỉ chọn câu crawl. Câu seed cũ được giữ trong DB cho các lượt thi/lịch sử đã lưu.

Integration kiểm tra đủ FULL 200/MINI 100/PART_5 30 câu thật, không lộ đáp án, không cắt nhóm và thư viện không tạo trùng. Đã thấy folder Santa 854 từ và trang thi thử 5.049 câu trên browser; tạo thử lượt Part 5 #862 hiển thị câu nguồn thực, chưa chọn hoặc nộp đáp án. Frontend editor thực hiện thay đổi catalog; reviewer kiểm tra React/khả năng truy cập không thấy blocker/major.
