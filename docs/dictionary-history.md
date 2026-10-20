# Tra từ và lịch sử

Từ điển 104.738 mục từ: https://github.com/skypediacode/english-vietnamese-dictionary, Skypedia / MinhQND, CC BY-SA 4.0. Ví dụ có thể được AI bổ sung. Chỉ mục chuyển từ SQLite sang gzip JSON, tối đa 8 nghĩa mỗi mục. Phân phối bản chỉ mục phải giữ LICENSE và ATTRIBUTION.md và cùng giấy phép.

Chạy `python backend/scripts/prepare-dictionary.py` từ gốc repo để tải, kiểm tra SHA256 và chuyển dữ liệu. Backend chạy từ backend, đọc storage/dictionary/en-vi.json.gz; VOCABULARY_DICTIONARY_PATH có thể ghi đè bằng đường dẫn tuyệt đối. Thiếu dữ liệu trả dictionaryAvailable=false; giao diện báo dịch vụ chưa sẵn sàng.

Ôn tập → Lịch sử làm bài (/history): phân trang 12 bài, lọc Thi thử/Reading và trạng thái. API GET /history chỉ trả bài của tài khoản đăng nhập; không trả đáp án. Bài đã nộp mở chữa bài; bài chưa nộp mở tiếp tục. Listening hiện lưu theo phiên luyện nghe riêng.
