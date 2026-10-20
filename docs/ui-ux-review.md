# UI/UX học tập — 06/10/2026

## Phạm vi

Đọc các trang, component dùng chung và kiểu dữ liệu trước khi sửa. Tham khảo cách nhóm điều hướng, tiếp tục học và theo dõi tiến độ trong [Learner Home của Khan Academy](https://support.khanacademy.org/hc/en-us/articles/360030629852-What-is-my-Learner-Home-page-and-what-can-I-do-there), không sao chép chức năng không có trong hệ thống.

Thay đổi lần này nằm ở frontend. Các thay đổi Listening backend đang có trong working tree thuộc lượt sửa trước; không thay đổi API, cách chấm hoặc DAS3H trong lượt UI/UX này.

## Đã triển khai

- Điều hướng nhóm Việc học / Luyện tập / Ôn kiến thức / Kiểm tra; mobile dùng menu thu gọn, có skip link và trạng thái trang hiện tại.
- Trang chủ lấy bài đang học, phiên nghe và lịch sử luyện từ API hiện có. Bỏ banner, số liệu mẫu và thống kê xác suất mô hình. Tiến độ được ghi rõ là lịch sử gần đây, không phải tổng trọn đời.
- Gợi ý học tiếp ưu tiên hành động luyện; bộ lọc, tổng quan Part và lộ trình mở theo yêu cầu. Không hiển thị xác suất DAS3H, mã ZPD hoặc dự đoán tăng điểm cho học viên.
- Reading ưu tiên văn bản và câu hỏi, giảm cuộn lồng; Listening thu gọn thư viện và thiết lập khi đang học. Giữ thời điểm mở đáp án theo kết quả đã nộp; gia sư mở theo yêu cầu.
- Thi thử dùng một nút bắt đầu và chọn chế độ bằng radio. Part 5 không còn vùng media trống; bảng câu hỏi mở khi cần, lời giải của câu đúng có thể thu gọn sau khi nộp.
- Lý thuyết tiếp tục render Markdown; quiz có lỗi nhập liệu ngay trong trang. Flashcard lật bằng Enter/Space, mặt đang ẩn không nhận focus; dialog giữ focus, hỗ trợ Escape và trả focus khi đóng.
- Nền kem, font Arial có fallback, màu xanh trầm, nút và form dùng chung. Giảm trang trí giấy, shadow, chuyển động và khoảng trắng; lỗi mạng dùng thông báo tiếng Việt.
- Reading admin có editor câu hỏi, lựa chọn, đáp án, dẫn chứng; JSON nằm trong nâng cao, có xem trước bản đã lưu và nhắc lưu trước khi duyệt/xuất bản. Listening admin có nhãn form, xem trước media, báo lỗi và giới hạn trong mục nâng cao.

## Kiểm tra

- TypeScript, ESLint, production build: đạt. 31 test frontend: đạt, gồm Markdown/SSE, lưu phiên thi và 4 test editor Reading bảo toàn dữ liệu.
- Reading integration: đạt, gồm save/resume, dẫn chứng, chấm bài, nộp lại, lịch sử phiên bản, quyền riêng tư và worker.
- Learning integration: đạt, gồm migration, resume/concurrency, nộp thiếu, review/rollback và cập nhật DAS3H.
- Listening integration: đạt, gồm lời thoại ẩn, cloze/dictation, kết quả và tiến độ đã lưu, quyền riêng tư, admin publishing, local Whisper và worker YouTube READY.
- Browser desktop 1440×900 và mobile 393×852: điều hướng, tiếp tục Reading/Listening, nội dung lý thuyết Markdown, quiz báo câu chưa trả lời, mở/đóng luyện kỹ năng, Tab/Shift+Tab/Escape, lật flashcard, dialog thêm từ và chọn chế độ thi. Không tràn ngang ở Home, Reading, Listening và trang chọn đề trên mobile.
- Các lần nộp/chấm tích hợp dùng tài khoản test riêng; không nộp đáp án trên tài khoản học viên đang mở để thử giao diện.

## Hạn chế

- Dữ liệu hiện tại còn câu hỏi phục vụ bulk test và một số audio không tải được. Không thay hay xóa nội dung học trong phạm vi UI/UX.
- Browser hiện đăng nhập học viên: chưa thử thủ công toàn bộ biểu mẫu admin hoặc nộp một đề đầy đủ qua UI. Editor đã có test riêng, API admin và nộp bài đã được kiểm tra tích hợp.
- Chưa kiểm tra micro trên điện thoại thật hoặc toàn bộ tổ hợp thiết bị/trình duyệt. Chức năng ghi âm giữ nguyên.
- Build có cảnh báo một JavaScript chunk hơn 500 kB; chưa thay cấu trúc bundling trong lượt này.

Ảnh xác nhận: [Trang chủ desktop](ui-home-ux.png), [Reading mobile](ui-reading-mobile.png).

Chưa commit hoặc push.
