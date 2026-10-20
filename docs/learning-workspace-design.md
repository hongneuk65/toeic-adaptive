# Không gian học — điều hướng ngang và trải nghiệm riêng theo tác vụ

Yêu cầu hiện tại: bỏ điều hướng bên trái ở mọi màn học, mỗi phần tham khảo nguồn PREP riêng để đa dạng bố cục, giữ nguyên trang chủ.

## Nguồn và cách chuyển thể

| Phần | Nguồn PREP đã đọc | Chuyển thể trong repo |
| --- | --- | --- |
| Reading | https://prepedu.com/vi/blog/toeic-reading và https://prepedu.com/vi/blog/tai-lieu-reading-toeic | Thư viện bài đọc có bộ lọc, danh sách đánh số, tiêu đề và metadata rõ; không dùng bố cục bìa của trang thi thử. |
| Listening | https://prepedu.com/vi/blog/cach-luyen-nghe-toeic | Luồng luyện theo bài/đoạn, thư viện media riêng, màu xanh biển đậm và teal; khu vực player tập trung khi chọn bài. |
| Lý thuyết | https://prepedu.com/vi/blog/ngu-phap-toeic | Bài học có phân cấp nội dung, chọn Part và mục lục nằm trên bài viết; không có rail trái. |
| Từ vựng | https://prepedu.com/vi/blog/600-tu-vung-toeic | Tổ chức theo chủ đề, sổ từ cá nhân, các nhóm chủ đề dạng kệ; giữ flashcard và lịch ôn hiện có. |
| Gợi ý học | https://prepedu.com/vi/toeic | Ưu tiên hành động kế tiếp dựa trên dữ liệu học thật, sau đó chẩn đoán kỹ năng và lộ trình. |
| Thi thử | https://prepedu.com/vi/toeic/test-practice#hero | Hero xanh, điều hướng ngang, khối thư viện trắng bo cong, lựa chọn bài dạng bìa và cuộn ngang mobile. |
| Lịch sử/chữa bài | Hướng dẫn PREP Reading/Listening: https://prepedu.gitbook.io/preps-user-manual/eng-version/learn-with-prep/for-exam-products-ielts-toeic-hsk/manage-learning/how-can-i-practice-with-reading-and-listening-skills | Danh sách tiến độ theo ngày, kết quả và đường dẫn chữa bài; timeline là thiết kế riêng, không khẳng định PREP có trang lịch sử công khai giống vậy. |

Đã đọc nội dung web và đối chiếu HTML công khai của Reading, Listening, ngữ pháp, từ vựng, TOEIC, Test Practice. Đây là tham khảo về tổ chức và ngôn ngữ thiết kế, không sao chép pixel hay khẳng định đã xem giao diện nội bộ có đăng nhập. CUA bị tắt trong Work settings nên chưa kiểm chứng hiệu ứng của PREP trực tiếp. Các chuyển động local tự triển khai, dùng transform/opacity và tôn trọng prefers-reduced-motion.

## Cấu trúc và hệ thống

- StudyNavigation là navigation landmark nằm trên nội dung; không còn layout hai cột dành cho sidebar. Desktop link dạng pill, mobile select có nhãn. Trang chủ không dùng component này nên giữ giao diện cũ.
- Reading dùng nền giấy trung tính; Listening hero xanh biển và thư viện media; lý thuyết bài viết tập trung; từ vựng nền ấm với các nhóm chủ đề; gợi ý học ưu tiên panel hành động; lịch sử timeline.
- Cùng font hiện có, navy cho thương hiệu, nút bo tròn và focus rõ. Màu riêng phục vụ nhận diện tác vụ. Chỉ selector study-layout tác động theme mới, không tác động home/admin/auth.
- Không đổi API, dữ liệu, điều kiện bắt đầu thi, lưu nháp, lịch ôn hay tính điểm.

## Xác minh

Playwright chạy cả desktop/mobile cho điều hướng, từng thư viện, bài lý thuyết, gợi ý, lịch sử, thi thử, lỗi/retry, reduced motion và các luồng autosave/submit/flashcard. Ảnh render lưu trong frontend/test-results. Kiểm tra main nằm dưới navigation và article nằm dưới mục lục, không tràn ngang, không pageerror. Đối chiếu SHA256 bảy file trang chủ. Chưa kiểm tra screen reader thủ công hay mọi thiết bị thật.

## Tinh chỉnh sự hài hòa — 2026-10-19

Các bố cục riêng dùng chung token nền #f5f7fc, bề mặt trắng, nền phụ #edf2fa, navy #203c79, accent #2458d3, viền #e1e7f0, chữ phụ #647282. Loại các nền kem/teal khác hệ, viền nhiều màu của thư mục, hero Listening quá nặng và kích thước hero Exam quá lớn. Header/điều hướng/nội dung cùng trục canh lề 1200px. Font, tiêu đề 32px (28px mobile), eyebrow, nhịp 24–28px, card 16px, nút pill được đồng bộ. Giữ khác biệt ở tổ chức: Reading danh sách, Listening thư viện media, từ vựng nhóm chủ đề, lý thuyết bài viết, lịch sử timeline. Exam vẫn có khối navy nhưng nằm trong cùng khung nội dung, không còn hero toàn màn hình và khối chồng cỡ lớn. Bộ lọc Reading trên mobile gọn thành hai cột. Trang chủ không đổi.

## Trang chủ là chuẩn thương hiệu — 2026-10-19

Yêu cầu mới làm rõ sự thống nhất phải bao gồm trang chủ. Đã bỏ StudyNavigation riêng và cho mọi màn học dùng lại LearningNavigation vốn có trên trang chủ: cùng capsule, nhóm Luyện tập/Ôn tập, Học tiếp, menu mobile. AppNavbar xuất đúng markup cũ trên dashboard; không chỉnh các file dashboard/home. Nền header màn học dùng chính dải màu #080d20 / #101b3d / #192e5c từ hero hiện có.

Token học tập lấy từ trang chủ: blue #1463e8, navy #233876, ink #18233f, nền #e5ecf6, panel #edf2f9, nền phụ #e7eef8, viền #bdcde3, chữ phụ #64708a. Góc card 24–28px, nút pill, font hiện có. Nhận diện từng phần lấy từ HomePrograms: Reading sky #225fc3/#eaf2ff; Listening #3d5598/#edf0fb; Lý thuyết #29716c/#e8f3f2; Từ vựng #926728/#f8f1e7; Thi thử #7056a5/#f0edfa. Màu chỉ hỗ trợ nhận diện, không thay thế nhãn trạng thái.

Exam dùng lại DuckMascot astronaut sẵn có để nối nhận diện với trang chủ, không thêm tài nguyên ngoài. Bố cục nghiệp vụ vẫn khác nhau theo phần. Kiểm thử bắt đầu từ dashboard, mở menu gốc để vào Reading rồi xác nhận menu chung, không có sidebar; tiếp tục chụp từng trang trên desktop/mobile. Screenshot homepage-brand-reference.png là bằng chứng đối chiếu, không sửa trang chủ. Bảy file home đối chiếu hash vẫn nguyên vẹn.
