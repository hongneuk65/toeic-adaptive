# Tổng quan chức năng và giao diện TOEIC Adaptive

Ngày rà soát: 06/10/2026. Mốc mã nguồn: `02dcffa`.

Tài liệu mô tả hành vi từ mã nguồn hiện tại. Đây không phải kết quả kiểm thử lại toàn bộ hệ thống hoặc đánh giá thực nghiệm hiệu quả học tập. Những tích hợp phụ thuộc nhà cung cấp AI, YouTube, trình duyệt và cấu hình triển khai có thể hoạt động khác nhau giữa các môi trường.

## 1. Điểm nhấn chính

Điểm nhấn mạnh nhất là vòng học cá nhân hóa: **làm bài → ghi nhận lịch sử theo kỹ năng → chọn câu luyện phù hợp → giải thích lỗi bằng AI và kiến thức liên quan → luyện tiếp**.

Hệ thống không chỉ cung cấp một hộp chat. Câu hỏi được gắn kỹ năng; kết quả luyện tập cập nhật hồ sơ người học; bộ chọn câu sử dụng xác suất trả lời đúng; gia sư có thể nhận câu hỏi, lựa chọn của người học, mức thành thạo và nội dung lý thuyết liên quan để giải thích. Đây là phần phù hợp nhất để trình diễn và làm trọng tâm nghiên cứu.

Tuy nhiên, cần phân biệt triển khai thuật toán với hiệu quả đã được chứng minh: repo chưa có pipeline fit trọng số DAS3H từ Riiid hay kết quả thực nghiệm xác nhận độ chính xác dự đoán và mức tăng điểm.

## 2. Chức năng hiện có

### Tài khoản và điều hướng

Đăng ký, đăng nhập, xác thực JWT và phân quyền USER/ADMIN. Sau đăng nhập có bảy khu vực: Trang chủ, Gợi ý, Flashcard, Lý thuyết, Listening, Reading và Thi thử. Các tài nguyên cá nhân trong Reading và Listening có kiểm tra quyền sở hữu.

Trang chủ hiện là màn hình dẫn vào việc học, với lời nhắc bắt đầu từ kỹ năng yếu và các lối tắt. Chưa phải dashboard phân tích có lịch học, streak, mục tiêu điểm hay thống kê thời gian học.

### Thi thử và xem lại bài

Có ba chế độ: FULL 200 câu, MINI 100 câu và Part 5 gồm 30 câu. Người học làm bài với bộ đếm giờ, điều hướng giữa các câu và nội dung văn bản/hình/audio tùy câu hỏi. Lựa chọn được giữ trong sessionStorage; thời gian dựa trên thời điểm bắt đầu từ backend để tải lại trang không khởi động lại đồng hồ.

Backend chấm đáp án, lưu bài và từng câu trả lời, kiểm soát nộp trùng. Sau nộp, người học xem đúng/sai, lời giải, lọc theo Part và hỏi gia sư tại câu cụ thể. Các câu đã trả lời được đưa vào hàng đợi cập nhật hồ sơ kỹ năng.

Giới hạn: bộ đề lấy những câu đầu theo ID của từng Part, chưa tạo đề ngẫu nhiên mỗi lần. Điểm Listening/Reading được quy đổi tuyến tính lên 495 mỗi phần, không phải bảng quy đổi TOEIC chính thức. Bài thi lưu danh sách ID câu hỏi, chưa lưu phiên bản bất biến của toàn bộ nội dung câu như Reading.

### Hồ sơ kỹ năng và luyện thích ứng

Trang Gợi ý tổng hợp mức thành thạo theo kỹ năng và Part, cho lọc kỹ năng yếu, chưa luyện hoặc đã thành thạo. Người học mở bài luyện trực tiếp từ kỹ năng cần cải thiện.

Bộ chọn câu sử dụng lịch sử đúng/sai trong các khoảng thời gian, năng lực người học, độ dễ của kỹ năng và độ khó câu hỏi để ước lượng xác suất đúng. Nó ưu tiên câu gần mục tiêu 75%, tránh 20 câu gần đây và có 15% lựa chọn khám phá.

Sau trả lời, backend chấm và cập nhật lịch sử, năng lực người học và mức thành thạo. Worker có cơ chế tránh ghi nhận lặp lại cùng job. Câu luyện lấy từ ngân hàng hiện có, không phải AI sinh câu mới tại thời điểm chọn.

Trọng số mặc định đang đóng vai trò prior. Năng lực người học vẫn được cập nhật online; không nên nói toàn bộ mô hình đang đóng băng. Mức 50% của kỹ năng chưa luyện là giá trị khởi tạo, không phải số đo năng lực thực tế. Điểm thành thạo lưu sẵn cũng không được tự tính lại chỉ vì người học mở trang vào ngày mới.

### Gợi ý thứ tự học

Hệ thống chia kỹ năng thành các nhóm ưu tiên theo ngưỡng thành thạo, sắp xếp kỹ năng yếu trước và liên kết đến bài lý thuyết tương ứng nếu có.

Đây là bộ quy tắc ưu tiên. Chưa có kế hoạch theo mục tiêu TOEIC, số phút rảnh mỗi ngày, lịch phiên học hoặc tự điều chỉnh lịch đã lưu. Các con số tăng điểm dự kiến trong phần gợi ý là heuristic, chưa phải dự báo được kiểm chứng.

### Gia sư AI và giải thích lỗi

Có chat chung, lịch sử chat và gia sư theo ngữ cảnh câu hỏi. Phần giải thích lỗi có thể sử dụng đáp án người học chọn, đáp án đúng, nội dung câu, kỹ năng, mức thành thạo và kiến thức truy xuất để giải thích lỗi, quy tắc và hướng luyện tiếp.

Truy xuất kiến thức hiện dựa trên từ khóa, Part và kỹ năng; chưa phải tìm kiếm embedding/vector. Một số luồng chat và giải thích hỗ trợ SSE streaming, có xử lý gián đoạn và chuyển nhà cung cấp khi phù hợp. Nội dung hiển thị bằng Markdown. Tutor Reading trả về nội dung hoàn chỉnh sau yêu cầu, chưa streaming như chat chung.

Giới hạn: chưa tự sinh báo cáo AI tổng hợp toàn bài thi ngay sau nộp. Chưa có luồng đầy đủ yêu cầu người học giải thích lập luận, AI đánh giá lập luận rồi kiểm tra chuyển giao bằng câu mới.

### Lý thuyết và quiz

Bài học được tổ chức theo Part và kỹ năng. Nội dung Markdown giúp tiêu đề, danh sách và đoạn văn hiển thị đúng thay vì lộ ký hiệu `##`. Mỗi bài có quiz ngắn tối đa năm câu từ ngân hàng, chấm ở backend và gửi kết quả cập nhật kỹ năng.

Quiz chưa có thực thể bài làm riêng để lưu toàn bộ phiên và xem lịch sử giống Reading hoặc Thi thử.

### Flashcard

Có thư mục, thêm/xóa từ theo quyền sở hữu, tìm kiếm, lật thẻ, chế độ tập trung và phát âm bằng speechSynthesis của trình duyệt. Người học đánh dấu Đã nhớ/Cần ôn; trạng thái và số lần ôn được lưu theo người dùng.

Reading cho lưu từ/cụm từ cùng câu gốc, nguồn bài, nghĩa và ghi chú vào thư mục riêng; hệ thống tránh lưu trùng theo nguồn.

Giới hạn: chưa có lịch ôn spaced repetition với ngày đến hạn hoặc thuật toán SM-2/FSRS. Chất lượng giọng đọc phụ thuộc giọng có sẵn trên thiết bị.

### Listening

Có bài audio/video/YouTube, chọn đoạn nghe, bài cá nhân và các dạng cloze, dictation, thu âm để tự đối chiếu. Transcript được xử lý phía hệ thống và không cần người học tự nhập script trước khi nghe. Bài tự thêm có thể xóa và khôi phục theo quyền sở hữu.

Với YouTube, hệ thống thử phụ đề tiếng Anh; nếu không lấy được có nhánh trích audio bằng yt-dlp/ffmpeg và nhận dạng bằng faster-whisper khi môi trường được cấu hình. Nếu nguồn bị chặn, người học có thể ghi audio từ tab bằng quyền trình duyệt hoặc tải lên audio của đoạn nghe để hệ thống phiên âm.

Giới hạn: YouTube vẫn có thể chặn truy cập; không thể bảo đảm mọi link tự lấy được transcript. Nhận dạng phụ thuộc chất lượng âm thanh và tài nguyên máy. Speaking hiện hỗ trợ thu âm/tự đối chiếu, chưa tự chấm phát âm. Kết quả Listening là kết quả luyện riêng, chưa cập nhật DAS3H hoặc quy đổi điểm TOEIC.

### Reading

Có thư viện bài hệ thống, bộ lọc và bài cá nhân tạo từ văn bản. AI tạo câu hỏi đọc hiểu, đáp án, giải thích và đoạn dẫn chứng; backend kiểm tra cấu trúc, lựa chọn và vị trí evidence. Quản trị viên có luồng nháp, xem lại và xuất bản.

Người học đọc bài, chọn đáp án, chọn dẫn chứng ở câu yêu cầu, lưu tiến độ và tiếp tục bài đang làm. Sau nộp mới mở đáp án/lời giải/dẫn chứng. Bài làm gắn với phiên bản nội dung để lịch sử không bị thay đổi khi bài được chỉnh sửa. Có lịch sử và làm lại.

Tutor hỗ trợ từ vựng, cấu trúc, gợi ý và giải thích; việc lưu từ có liên kết với Flashcard. Bài cá nhân và tiến độ được giới hạn theo chủ sở hữu.

Giới hạn: kiểm tra cấu trúc câu hỏi AI không chứng minh mọi câu đều đúng về ngữ nghĩa. Kết quả Reading chưa cập nhật DAS3H; evidence hỗ trợ luyện tìm căn cứ, chưa là thang chấm năng lực lập luận đã kiểm chứng. Tạo bài phụ thuộc nhà cung cấp AI và có thể thất bại/retry.

## 3. Giao diện hiện tại

### Điểm tốt

- Phong cách giấy học tập: nền kem, bề mặt giấy sáng, viền kraft, màu mực trầm và điểm nhấn coral. Có bản sắc phù hợp việc học.
- Font thống nhất Arial/Helvetica qua các nhóm font, giảm lỗi tiếng Việt và phụ thuộc tải font ngoài.
- Điều hướng chính bằng chữ; trang Gợi ý mở rộng chiều ngang, thông tin phụ thu gọn để ưu tiên kỹ năng cần học.
- Lý thuyết và câu trả lời AI hiển thị Markdown, dễ đọc hơn nội dung ký hiệu thô.
- Reading chia bài đọc và câu hỏi trên desktop, có tùy chọn cỡ chữ; màn hình nhỏ chuyển bố cục dọc.
- Có chuyển cảnh, modal và tương tác nhẹ; CSS hỗ trợ giảm chuyển động theo thiết lập người dùng.
- Không hiện nút gia sư chung trong phòng thi; Reading dùng tutor tại chỗ để tránh hai giao diện chat trùng nhau.

### Điểm còn thiếu đồng bộ

- Trang Thi thử còn nhiều màu trắng/slate/blue; Flashcard còn cách viết hoa và nút kiểu cũ. Toàn hệ thống chưa cùng một ngôn ngữ thị giác.
- Trang chủ chưa giới thiệu Reading và Listening tương xứng với chức năng đã có.
- Gợi ý còn các số liệu mô hình và ước lượng tăng điểm cần giải thích để người học không hiểu là kết quả đo chắc chắn.
- Điều hướng mobile là hàng ngang cuộn; phòng thi có nhiều vùng cuộn, cần kiểm tra riêng trên màn hình thấp.
- Luồng xử lý transcript và tạo Reading có nhiều trạng thái chờ/lỗi; nên dẫn người học bằng một hành động tiếp theo rõ ràng ở mỗi trạng thái.
- Một số thao tác quản trị còn thiên về nhập JSON, phù hợp kỹ thuật viên hơn người biên soạn nội dung.

## 4. Đánh giá so với năm ý tưởng AI ban đầu

1. **Phân tích bài làm:** đã có thống kê kỹ năng và giải thích từng câu sai; chưa có báo cáo AI toàn bài tự động đầy đủ.
2. **Gia sư theo câu hỏi:** đã có, là phần có thể trình diễn trực tiếp.
3. **Lộ trình tự điều chỉnh:** có ưu tiên kỹ năng và chọn câu thích ứng; chưa có kế hoạch theo mục tiêu và phút/ngày.
4. **Sinh bài cùng kỹ năng vừa sai:** Reading có tạo bài từ văn bản; chưa có pipeline sinh/kiểm duyệt câu mới gắn đúng kỹ năng cho ngân hàng adaptive.
5. **Kiểm tra hiểu thật:** Reading có chọn evidence; chưa có vòng đánh giá lập luận và kiểm tra lại bằng câu chuyển giao.

## 5. Cách demo điểm nhấn

Chọn một kỹ năng yếu ở Gợi ý → mở câu luyện thích ứng → trả lời sai → xem giải thích có quy tắc và kiến thức liên quan → mở lý thuyết → làm quiz → quay lại Gợi ý xem hồ sơ cập nhật và luyện câu tiếp theo.

Luồng này thể hiện rõ sự liên kết giữa dữ liệu học tập, bộ điều phối và AI. Khi thuyết trình nên gọi đó là cơ chế cá nhân hóa đang được triển khai và cần đánh giá thực nghiệm, không khẳng định đã tăng điểm hoặc dự đoán chính xác khi chưa có dữ liệu.

## 6. Nền tảng triển khai và nguồn đối chiếu

Frontend React/Vite/Tailwind; backend NestJS; Prisma/PostgreSQL có 28 model; Redis/BullMQ xử lý nền. Repo có cấu hình Docker Compose, migration và triển khai frontend/backend. Khả năng triển khai không đồng nghĩa mọi môi trường đã được kiểm chứng.

Các điểm đối chiếu chính: `frontend/src/App.tsx`, `frontend/src/index.css`, các trang trong `frontend/src/pages`, `backend/src/exam`, `backend/src/das3h`, `backend/src/mastery`, `backend/src/rag`, `backend/src/reading`, `backend/src/listening`, `backend/prisma/schema.prisma`, `docs/reading.md` và `docs/listening.md`.
