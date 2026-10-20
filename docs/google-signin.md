# Đăng nhập Google

Luồng Google Identity Services dùng popup và ID token. Backend xác minh chữ ký, issuer, audience, hạn dùng, email đã xác minh và nonce gắn với cookie HttpOnly của trình duyệt bằng `google-auth-library`. Không cần Client Secret và không xin quyền đọc Gmail/Drive.

## Cấu hình Google

1. Mở https://console.cloud.google.com/ và chọn/tạo project TOEIC Compass.
2. Google Auth Platform → Branding: tên ứng dụng, email hỗ trợ và email liên hệ. Audience: External. Nếu đang Testing, thêm tài khoản thử trong Test users; chuyển In production khi muốn người dùng bên ngoài đăng nhập.
3. Clients → Create client → Web application.
4. Authorized JavaScript origins: `https://toeic-compass.up.railway.app`. Phát triển cục bộ có thể thêm `http://localhost` và `http://localhost:5173`. Origin chỉ gồm scheme + host + port, không thêm `/login` hay `/api`.
5. Sao chép Client ID kết thúc `.apps.googleusercontent.com` và đặt biến Railway `GOOGLE_CLIENT_ID` ở service ứng dụng. Khởi động lại/deploy service để nhận biến mới. Local: đặt trong `backend/.env` rồi khởi động backend lại.

Không cần Authorized redirect URI cho popup JavaScript callback đang dùng. Client ID là mã định danh công khai, có thể gửi qua chat; không gửi Client Secret hoặc token Google.

## Hành vi tài khoản

- Client ID trống: đăng nhập email vẫn hoạt động, nút Google không hiện và không tải SDK.
- Người dùng mới: tạo tài khoản USER, không có mật khẩu cục bộ có thể sử dụng. Đăng nhập các lần sau bằng Google.
- Email đã có tài khoản cục bộ: yêu cầu mật khẩu hiện tại một lần trước khi liên kết. Giữ nguyên ID, quyền và lịch sử học; không tự gộp chỉ vì email trùng (email đăng ký cũ chưa được xác minh).
- Người dùng đã liên kết: nhận diện bằng Google `sub` ổn định, không dùng email làm định danh Google.
- Google ID token không được lưu vào localStorage; ứng dụng dùng JWT hiện có sau khi server xác minh. Không ghi log credential/password.
- Migration chỉ thêm cột nullable `User.googleSubject` và unique index, không thay đổi mật khẩu hoặc lịch sử tài khoản hiện có.

## Kiểm chứng

Backend có kiểm thử token sai, nonce sai/thiếu, email chưa xác minh, xác minh audience, tạo mới, liên kết bằng mật khẩu và signup đồng thời. Kiểm thử trình duyệt giả lập SDK để kiểm tra UI ở desktop/mobile và lỗi tải SDK; không thay thế kiểm thử đăng nhập Google thật sau khi cấu hình Client ID hợp lệ.

Thử thật: mở `/login`, chọn Google, xác nhận tài khoản; kiểm tra chuyển đến dashboard rồi tải lại vẫn đăng nhập. Thử email đã có tài khoản để xác nhận liên kết một lần và giữ lịch sử. Kiểm tra không bị `origin_mismatch`; nếu có, sửa Authorized JavaScript origins đúng origin đang mở.

Nguồn chính thức: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid và https://developers.google.com/identity/gsi/web/guides/verify-google-id-token.
