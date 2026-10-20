# Luyện nhớ chủ động và HLR cho flashcard

Ngày tích hợp: 19/10/2026. Phạm vi là flashcard; không thay trang chủ hoặc mô hình DAS3H.

## Luồng sử dụng

Trong chế độ tập trung, người học nhìn nghĩa và gõ từ/cụm từ tiếng Anh trước khi xem đáp án. Câu trả lời bị khóa khi mở đáp án. Bấm lưu gửi một attemptId ổn định; lỗi mạng có thể thử lại mà không ghi trùng. Backend đối chiếu từ của thẻ, chuẩn hóa Unicode, hoa/thường, khoảng trắng và dấu nháy. Đây là exact recall, không chấm ngữ nghĩa hoặc chấp nhận mọi từ đồng nghĩa.

Nút chưa nhớ gửi câu trả lời rỗng. Chế độ lưới vẫn cho duyệt thẻ và tự đánh giá; các lượt này mang nhãn self_report và không được tính vào số đúng/sai dùng huấn luyện HLR. Không lấy lượt đánh dấu nhớ trong lịch sử cũ làm nhãn đúng khách quan.

## Trạng thái mô hình

Lượt typed dùng HLR dạng `p = 2^(-lagDays / h)`, `h = 2^(w.x)` với `x = [1, sqrt(wins), sqrt(losses)]`. Khi không có artifact đã kiểm định, trọng số khởi tạo `[1, 1, -1]` là lựa chọn kỹ thuật, KHÔNG phải hệ số trong bài báo hoặc mô hình đã học từ EdNet. API trả `hlr-prior-experimental` để phân biệt. Đây là tích hợp thực nghiệm, chưa chứng minh lợi ích học tập tại ứng dụng.

Sau lượt ôn, lịch tiếp theo dùng mức nhớ mục tiêu 0.8; đây cũng là tham số kỹ thuật chưa được chứng minh tối ưu cho TOEIC. Giới hạn khoảng ôn 10 phút–30 ngày, trả lời sai quay lại sau 10 phút. Thời điểm dueAt chính xác là nguồn chính; intervalDays chỉ là số ngày nguyên hiển thị tương thích. Tự đánh giá tiếp tục dùng lịch cũ, source `fixed-interval`.

Lưu từng lượt trong FlashcardRecallEvent cùng timestamp server, khoảng cách ôn, số đúng/sai TRƯỚC lượt hiện tại, mode, fingerprint nội dung, dự đoán trước lượt và kết quả lịch ôn. Không lưu câu trả lời tự do; chỉ lưu hash yêu cầu để phát hiện retry mâu thuẫn. Thay word/meaning đặt lại chứng cứ cho nội dung mới. Lượt đầu và lượt sau self_report không tạo mẫu lag hợp lệ cho trainer.

## Huấn luyện khi có đủ lịch sử

Từ thư mục backend, sau build:

```powershell
node scripts/export-hlr.cjs ../experiments/hlr/data/recall.json
```

Thư mục dữ liệu được tạo tự động; dữ liệu này là dữ liệu người học giả danh, chỉ lưu nội bộ. File xuất không chứa email, từ, nghĩa hoặc câu trả lời tự do. Script không ghi đè file có sẵn.

Từ thư mục gốc:

```powershell
python experiments/hlr/train.py experiments/hlr/data/recall.json experiments/hlr/artifacts/model.json
```

Thư mục artifacts được tạo tự động. Trainer dùng thư viện chuẩn Python, tối ưu binary log loss với regularization, không phải tái lập nguyên bản loss half-life của Settles & Meeder. Cần >=30 học viên, >=1000 lượt typed có lag >=10 phút, và >=100 lượt mỗi split; các mức này là chốt kỹ thuật tối thiểu, không phải bảo đảm đủ lực thống kê.

Chia học viên 60/20/20, seed 2026. Chọn trọng số/epoch trên validation, test chỉ để đánh giá. So sánh prior và hằng số fit từ train; bootstrap theo học viên 1000 lần. Chỉ `releaseGate: true` nếu test log loss cải thiện ít nhất 0.001 so với cả hai baseline và cận trên CI chênh lệch với prior <0. Ngưỡng 0.001 là điều kiện kỹ thuật do dự án chọn. Việc chọn lặp lại nhiều bản trên cùng test gây overfit: khi dùng kết quả để sửa mô hình, cần cohort test mới trước phát hành tiếp.

Artifact đạt gate có thể đặt vào backend/models rồi cấu hình `HLR_MODEL_PATH=models/<file>.json` và khởi động lại backend. Loader kiểm tra contract, phiên bản và hệ số hữu hạn; artifact lỗi làm khởi động thất bại thay vì âm thầm dùng mô hình sai. Chỉ bật artifact có nguồn gốc tin cậy. API source trở thành `hlr-trained:<version>`. Để rollback, bỏ HLR_MODEL_PATH và restart; lịch đã lưu được giữ, lượt tiếp theo dùng prior.

## Kiểm chứng và giới hạn

- Unit tests: công thức half-life, xác suất theo lag, giới hạn lịch, chuẩn hóa đáp án.
- Integration PostgreSQL schema riêng: chấm server, retry đồng thời, quyền truy cập, mâu thuẫn attemptId, lag, tự đánh giá và thay đổi nội dung.
- Playwright desktop/mobile: ẩn đáp án, nhập bàn phím, lưu, retry giữ nguyên câu trả lời và mã lượt.
- Chưa huấn luyện mô hình thật khi chưa đủ log typed; không tạo dữ liệu giả để tuyên bố hiệu quả.
- Dữ liệu do người học tự chọn lượt ôn có selection bias. Nhìn được đáp án trong tab khác vẫn có thể làm nhãn sai; cơ chế này không phải chống gian lận.
- Cần thử nghiệm có kiểm soát đo nhớ sau 7/30 ngày và làm câu mới trước khi kết luận cải thiện học tập hoặc điểm TOEIC.
- Chưa tự động tạo câu tương đương từ câu thi sai hoặc mở rộng sang Reading/Listening; không suy diễn các lượt đó thành nhãn nhớ flashcard.

Nguồn phương pháp: [Settles & Meeder, ACL 2016](https://aclanthology.org/P16-1174/), [Roediger & Karpicke, 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x).
