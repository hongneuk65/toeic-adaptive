# Quản trị TOEIC Adaptive

## Truy cập

Đăng nhập bằng tài khoản có `role = ADMIN` để vào thẳng `/admin`. ADMIN chỉ dùng khu vực quản trị; đường dẫn học tập tự chuyển về `/admin`, và API học tập trả 403 cho ADMIN. USER chỉ dùng khu vực học tập; mở `/admin` sẽ chuyển về `/dashboard`. Đăng ký công khai luôn tạo tài khoản USER. Khu vực quản trị tải riêng để không làm tăng gói giao diện học viên.

Backend xác thực JWT và đọc lại tài khoản trong cơ sở dữ liệu cho mỗi yêu cầu. Việc thu hồi quyền có hiệu lực với cả token đã cấp; tài khoản đã xóa không thể tiếp tục dùng token cũ. Mật khẩu và password hash không được trả về trong API quản trị.

## Phạm vi hiện có

- Tổng quan: số lượng người học, câu hỏi, kỹ năng, lượt thi, nội dung, phản hồi chờ xử lý; phân bố câu hỏi theo Part và lượt thi gần đây. Khối **Chất lượng dữ liệu** hiện câu nháp, câu đã xuất bản thiếu media, tri thức chờ duyệt và số câu đang xuất bản mà DAS3H đã huấn luyện chấm được (phần còn lại dùng cách tính dự phòng).
- Người học: tìm kiếm, xem thông tin và đổi USER/ADMIN. Không thể tự gỡ quyền hoặc gỡ quản trị viên cuối cùng; kiểm tra này chạy trong transaction Serializable.
- Câu hỏi: tìm kiếm, lọc Part/nguồn/trạng thái, tạo/sửa nội dung, đáp án, giải thích, độ khó, media và liên kết kỹ năng. Kỹ năng phải thuộc cùng Part.
  - Vòng đời `DRAFT → PUBLISHED → ARCHIVED`. Câu admin tạo mới là bản nháp; chỉ câu `PUBLISHED` vào đề thi, luyện tập, placement và DAS3H (cổng chung `common/imported-questions.ts`). Xuất bản kiểm tra lại media, phương án và kỹ năng. Ẩn (`ARCHIVED`) thay cho xóa: lượt thi cũ vẫn tải câu theo ID.
  - Media bắt buộc theo Part: Part 1 cần ảnh và âm thanh, Part 2–4 cần âm thanh, Part 6–7 cần đoạn văn. Đường dẫn chỉ nhận `https://` hoặc đường dẫn nội bộ bắt đầu bằng `/`. Chuỗi rỗng được lưu là `NULL`. Câu cũ thiếu media vẫn sửa được nội dung, nhưng không được sửa làm thiếu media thêm.
- Kỹ năng: tạo/sửa. Không đổi mã hoặc Part của kỹ năng đang được câu hỏi, lý thuyết hoặc tri thức AI sử dụng.
- Lý thuyết: tạo/sửa/xóa, liên kết kỹ năng cùng Part. Sửa và xóa xử lý các knowledge chunk dẫn xuất trong cùng transaction; xóa có xác nhận. Retriever đọc trực tiếp bài học và làm mới cache tối đa sau 60 giây.
- Reading: dùng công cụ biên soạn, phiên bản, duyệt/xuất bản và xử lý lỗi hiện có.
- Listening: quản lý nguồn nháp/xuất bản, media, phụ đề, retry transcript và giới hạn tài nguyên hiện có.
- Lượt thi: tra cứu người học/email, loại đề hoặc ID và xem kết quả; không sửa lịch sử thi.
- Flashcards: xem kho thẻ, tạo/sửa thẻ hệ thống trong thư mục công khai **Từ vựng hệ thống**, để học viên truy cập và ôn lại. Thư mục có khóa dành riêng `admin-system-vocabulary`; thẻ cá nhân chỉ xem. Thẻ hệ thống cũ chưa có thư mục được chuyển vào thư mục công khai khi chỉnh sửa.
- Kho tri thức AI: tạo/sửa nội dung, Part, nhóm, mã kỹ năng và từ khóa. Duyệt/Thu hồi trong hộp **Chi tiết**: nhập nguồn `https://` và phiên bản; người duyệt là tài khoản đang đăng nhập; duyệt bị từ chối nếu nội dung đã đổi sau khi mở. Duyệt xong tự tạo embedding khi `RAG_EMBEDDING_ENABLED=true` (lỗi index không hủy duyệt; chạy lại `scripts/index-tutor-knowledge.cjs`). Script `review-tutor-knowledge.cjs` dùng chung logic này.
- Báo lỗi: lọc trạng thái, đánh dấu đã xử lý hoặc mở lại cho Reading và Listening.
- Hoạt động AI: xem sự kiện Reading AI, trạng thái, thời gian và lỗi. Đây chưa phải thống kê toàn bộ nhà cung cấp AI/chat.
- Nhật ký quản trị: mọi thao tác ghi thành công qua `/api/admin/*` được lưu vào `AdminAuditLog` (người thực hiện, route, ID bản ghi, nội dung gửi đã rút gọn). Nhật ký ghi sau khi thao tác thành công, không cùng transaction; ghi lỗi chỉ cảnh báo trong log. Thao tác trong Reading/Listening admin chưa được ghi.

Danh sách dùng phân trang phía server, tối đa 100 bản ghi/yêu cầu.

Triển khai: `npx prisma migrate deploy` (migration `20261121090000_question_status`, `20261121091000_admin_audit_log`; câu hiện có mặc định `PUBLISHED`) → `npx prisma generate` → build. Sửa dữ liệu cũ một lần: `node scripts/normalize-question-media.cjs` (chạy thử) rồi thêm `--write`.

## Kiểm chứng và giới hạn

Chạy `npm run build`, `npm test`, `npm run lint` trong frontend và backend theo script tương ứng. Kiểm thử quyền/token nằm tại `backend/src/auth/jwt.strategy.spec.ts`; kiểm thử nghiệp vụ tại `backend/src/admin/admin-management.spec.ts`.

Kiểm tra trình duyệt bằng fixture cô lập xác nhận tổng quan desktop, form câu hỏi/mobile 390px và Reading/tablet 768px. Cần kiểm tra tích hợp tiếp với PostgreSQL/Redis đang chạy và tài khoản ADMIN thật trước khi triển khai. Các kiểm thử unit không thay thế kiểm thử transaction đồng thời trên PostgreSQL.

Chưa có upload media và tạo nhóm câu Part 3/4/6/7 trong form, nhập hàng loạt, khóa tài khoản, phân quyền nhiều cấp hoặc chỉnh sửa cấu hình bí mật của hệ thống. Đây là các chức năng riêng cần schema và quy trình vận hành, không phải các nút giả trong giao diện hiện tại.
