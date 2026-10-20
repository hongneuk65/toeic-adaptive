# Tra và lưu từ khi học

Bôi đen một từ hoặc cụm ngắn (tối đa 12 từ/120 ký tự) trong Reading, Listening, lý thuyết, flashcard hoặc trang chữa bài thi. Bấm **Tra từ / lưu từ** để mở hộp tra cứu. Công cụ không xuất hiện trong phòng thi tính giờ.

Tra cứu ưu tiên nghĩa đã có trong thư viện Santa, thư viện công khai và thẻ cá nhân được phép truy cập. Có đối chiếu dạng biến đổi đơn giản; người học chọn nghĩa phù hợp. Khi chưa tìm thấy, có thể nhập nghĩa hoặc chủ động bấm **Giải nghĩa bằng AI**. Kết quả AI được ghi rõ và phụ thuộc cấu hình/hạn mức nhà cung cấp; lỗi AI không chặn nhập nghĩa thủ công.

Chọn thư mục cá nhân hoặc để mặc định **Từ vựng đã tra**. Câu/ngữ cảnh đã chọn được đưa vào ô ví dụ và có thể sửa trước khi lưu. Từ đã có trong cùng thư mục không tạo thêm bản sao; nghĩa cũ không bị ghi đè. Thẻ mới giữ đường dẫn trang nguồn trong ghi chú.

Trang chữa đề có mục **Tư liệu gốc**, hiển thị audio, passage, bảng và ảnh để đọc lại và chọn từ trong tài liệu. Tư liệu chỉ mở sau khi đã nộp bài theo phân quyền API hiện có.

API: `GET /vocabulary/lookup`, `POST /vocabulary/explain`, `POST /vocabulary/save`. Yêu cầu JWT tài khoản học viên, giới hạn độ dài đầu vào, chặn ghi vào thư mục người khác/thư viện nguồn, khóa giao dịch trước khi tạo thư mục mặc định và chống lưu đồng thời trùng thẻ. Không thay đổi schema.

Kiểm tra: frontend build/lint và 61 tests đạt; backend build/lint và toàn bộ 187 tests đạt. `backend/test/vocabulary.integration.cjs` đạt với database thật: tra nghĩa Santa, cách ly thẻ riêng tư, chặn thư mục người khác, lưu ngữ cảnh, lưu vào thư mục tự chọn, hai yêu cầu đồng thời chỉ tạo một thẻ. Dữ liệu thử được dọn sau kiểm thử.

Chưa kiểm tra trực tiếp selection/dialog trên browser: công cụ browser bị tắt trong Work settings ở lượt thực hiện này. Không gọi AI thật trong kiểm thử để tránh phát sinh yêu cầu ngoài cần thiết.
