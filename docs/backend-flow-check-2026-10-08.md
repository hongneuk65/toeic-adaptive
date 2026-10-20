# Kiểm thử backend Listening và Reading — 08/10/2026

> Cập nhật sau kiểm thử: đã bỏ hai container `toeic-adaptive-postgres-1` / `toeic-adaptive-redis-1` và file override cổng 55432. Backend hiện dùng lại `toeic-postgres` ở 5432 và `toeic-redis` ở 6379; `.env` đã đồng bộ thông tin đăng nhập database gốc. Database gốc có 106 tài khoản, 13 nguồn Listening và 26 bài Reading lúc kiểm tra. Không xóa volume hay dữ liệu gốc. `infra:up` / `infra:down` chỉ start/stop hai container hiện có. Sau chuyển đổi, `/health/ready` trả 200 OK và Redis trả PONG. Phần môi trường 55432 bên dưới mô tả lượt kiểm thử trước đó, không còn là cấu hình đang chạy.

## Kết quả thực tế

- Node 24.19.0; sinh lại Prisma Client 5.22.0; backend build thành công.
- Jest: 25 suite, 110 test, tất cả qua.
- Reading integration qua với API HTTP, PostgreSQL và Redis thật. AI sinh câu hỏi dùng fixture local; chưa gọi provider AI thật.
- Listening integration qua cho bài mẫu và các kiểm tra lưu tiến độ/phân quyền. Video YouTube `jNQXAC9IVRw` trả FAILED: máy chủ chưa kết nối được YouTube. Đây là kiểm thử xử lý lỗi thành công, không phải tạo transcript thành công.
- Test Whisper upload audio bị bỏ qua do ASR không khả dụng trong cấu hình đang chạy.
- Cuối lượt kiểm thử, `GET /health/ready` trả HTTP 200, `{"status":"ok"}`.
- Tài khoản và nội dung test được script tự dọn. Giữ dữ liệu seed: một bài nghe 4 câu và 25 bài đọc/125 câu hỏi.

## Listening: từ chọn nguồn đến nhận kết quả

1. Sau đăng nhập, `GET /listening` trả thư viện nguồn nghe và phiên học của người dùng.
2. Chọn nguồn và mốc đầu/cuối, gọi `POST /listening/sessions`. Backend kiểm tra quyền và đoạn nghe tối đa 300 giây theo cấu hình mặc định; chỉ lấy câu có mốc nằm trọn trong đoạn.
3. Nếu đã có transcript READY, backend gắn phiên bản đó vào phiên học. Nếu chưa có transcript cho YouTube, backend yêu cầu hàng đợi chuẩn bị. Phiên chưa có transcript có thể được gắn transcript khi tải lại sau khi xử lý xong.
4. Transcript được chia thành các câu có timestamp. API bài tập không trả toàn bộ lời thoại trước khi trả lời. CLOZE trả token và chỗ trống; DICTATION yêu cầu chép toàn câu; SPEAK chỉ tự đối chiếu.
5. `POST /listening/sessions/:id/answers` kiểm tra câu, chế độ và độ khó có khớp phiên hiện tại. CLOZE so khớp các từ bị che; DICTATION so khớp toàn câu. Chấm bằng code, không gọi LLM. Chuẩn hóa chữ hoa/thường, dấu câu và một số contractions; trả điểm 0–1 và các từ đúng/sai/thiếu/thừa/lỗi chính tả. Không tự đánh giá nguyên nhân nghe sai.
6. Sau nộp, trả lời thoại chuẩn và feedback, ghi ListeningAnswer. `PATCH /listening/sessions/:id` lưu câu hiện tại, chế độ, độ khó và yêu thích. `GET` phiên trả lại tiến độ và feedback gần nhất của đúng câu/chế độ/độ khó.

Ví dụ đã chạy: bài demo đoạn 0–30 giây có 4 câu. Câu đầu là “The meeting will begin at nine oclock.” Chép đúng câu đó được score = 1. Chuyển vị trí sang câu thứ ba và bật yêu thích, tải lại vẫn giữ currentIndex = 2 và favorite = true. Chuyển chế độ không hiển thị nhầm feedback cũ.

Với YouTube, hệ thống ưu tiên phụ đề tiếng Anh; nếu không lấy được và ASR sẵn sàng thì nhận dạng audio của đúng đoạn. Transcript tự động có thể sai. Lượt chạy này chưa xác nhận nhánh YouTube READY hay Whisper thật. Nguồn cá nhân thuộc chủ tài khoản; xóa mềm ẩn cả nguồn và phiên, khôi phục trả lại tiến độ. Admin có thể nhập phụ đề và xuất bản nguồn; học viên không có quyền nhập script qua API admin.

## Reading: từ chọn bài đến chấm và ôn từ

1. `GET /reading` trả bài thư viện đã xuất bản, bài cá nhân và lịch sử của người dùng. Bài hệ thống cần admin duyệt đúng phiên bản trước khi xuất bản.
2. `POST /reading/articles/:id/start` tạo lần làm ReadingAttempt gắn với một ReadingVersion. Mở đồng thời hai lần vẫn trả cùng lần làm đang hoạt động. Trước nộp, API ẩn đáp án, lời giải và bằng chứng mẫu.
3. Đọc bài và trả lời câu ý chính trước khi chuyển sang câu khác. `PATCH /reading/attempts/:id` lưu lựa chọn, đoạn bằng chứng, vị trí câu và thời gian; tải lại lấy đúng trạng thái đã lưu.
4. Gia sư trước nộp không cho dùng chế độ ANSWER. HINT trước nộp là hướng dẫn chung viết sẵn, không phải bằng chứng AI thật đã trả lời. WORD/STRUCTURE và hỗ trợ sau nộp có nhánh gọi AI.
5. `POST /reading/attempts/:id/submit` kiểm tra dữ liệu, yêu cầu đáp án/bằng chứng theo câu rồi đếm số lựa chọn đúng. Bằng chứng được lưu và kiểm tra hợp lệ nhưng không cộng/trừ điểm trắc nghiệm. Sau nộp mới trả đáp án, lời giải và bằng chứng mẫu. Nộp lại cùng lần làm giữ nguyên kết quả.
6. Làm lại tạo lượt tiếp theo. Lượt cũ giữ phiên bản cũ dù admin xuất bản bản mới; archive bài hệ thống không làm mất lịch sử người học.
7. `POST /reading/attempts/:id/words` lưu từ cùng nghĩa và câu gốc vào bộ flashcard riêng. Lưu lại cùng từ/ngữ cảnh cập nhật nghĩa thay vì nhân đôi; ôn từ được ghi lại và người khác không truy cập được.

Ví dụ đã chạy: bài hệ thống 5 câu được lưu tại currentIndex = 4, elapsedSeconds = 22; tải lại giữ nguyên. Nộp lựa chọn đúng được correct = 5, total = 5. Nộp lặp không đổi điểm; bắt đầu lại cùng phiên bản được tryNumber = 2. Chọn từ “training” và lưu hai lần vẫn cùng flashcard ID, nghĩa được cập nhật.

## Reading cá nhân dùng AI

`POST /reading/personal` nhận văn bản tiếng Anh tối thiểu 40 từ, mặc định tối đa 10.000 ký tự. Backend giữ văn bản gốc, chống trùng theo nội dung/tài khoản, kiểm tra hạn mức Redis và đẩy job BullMQ.

Trạng thái đi từ CREATING → PROCESSING → READY hoặc FAILED. Worker yêu cầu AI trả JSON có câu hỏi, bốn lựa chọn, đáp án, giải thích và trích dẫn thật trong bài. JSON hoặc bằng chứng không hợp lệ thì không tạo bài giả; giữ văn bản gốc và lưu lỗi. Mỗi bài tối đa ba lần thử theo code hiện tại.

Integration đã kiểm chứng worker và lưu trạng thái thành công/thất bại bằng provider fixture local, kiểm tra JSON/evidence và quota Redis thật. Lần bật test AI thật bị bộ phê duyệt tự động chặn vì sẽ gửi đoạn văn test đến nhà cung cấp bên ngoài; chưa thực thi nhánh đó.

## Điểm cần hiểu

Hai module lưu bài và kết quả riêng. Listening integration đã xác nhận không đổi ability, StudentSkillHistory hoặc UserSkillMastery; Reading theo code cũng không cập nhật DAS3H. Vì vậy luyện hai phần này hiện chưa tự điều chỉnh năng lực/lịch ôn thích ứng.

Phạm vi kiểm tra là backend, chưa thao tác giao diện hoặc phát audio trong trình duyệt ở lượt này. Unit/integration qua không đồng nghĩa mọi video YouTube hoặc mọi yêu cầu AI đều hoạt động.

## Môi trường chạy thử

Node mặc định của máy là 20.20.2 nên dùng Node 24 đi kèm runtime. PostgreSQL ban đầu không bind được cổng 5432, vì vậy dùng compose override tại `backend/storage/test-compose.override.yaml` để chạy database mới ở 55432; Redis ở 6379, API ở 3000. Không sửa file `.env`: chỉ thay cổng DATABASE_URL trong môi trường tiến trình. Migration đã áp dụng trên database local mới.

Trong lúc kiểm thử các container test đã bị dừng từ bên ngoài; đã khởi động lại và chạy lại Listening thành công. Cuối lượt API cùng PostgreSQL/Redis test đang hoạt động. Để dùng lại cấu hình kiểm thử, cần giữ override cổng 55432 và thay cổng DATABASE_URL khi chạy tiến trình; lệnh start thông thường vẫn đọc 5432 từ `.env`.
