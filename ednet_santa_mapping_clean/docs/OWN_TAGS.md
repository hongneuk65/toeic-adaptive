# Bộ tag riêng — Part 1 và tái phủ EdNet

Trạng thái: proposal nghiên cứu, chưa chốt ngữ nghĩa.

- 92 nhãn nội dung/kỹ năng/định dạng riêng, 5 mã thuộc tính tách riêng.
- Part 1: 18 tag nguồn → 6 nhóm chủ đề rộng.
- Crawl Part 1: 318 câu; 318 có ứng viên, 0 chưa có.
- Câu EdNet Part 1 match ID: 0. Không dùng câu Santa khác ID làm chứng minh nghĩa tag EdNet.
- Hàng chờ: 57 cặp tag/Part chưa có mapping nội dung; không bỏ hoặc ép gán.

## Nhóm Part 1

- Sinh hoạt, thao tác và giao tiếp: tag [1, 5, 13, 14, 15]; crawl ứng viên 108/318; EdNet chiếu từ tag 153/643.
- Tư thế và quan sát: tag [8, 9]; crawl ứng viên 57/318; EdNet chiếu từ tag 98/643.
- Lao động, chăm sóc và thiết bị: tag [3, 4, 16, 180]; crawl ứng viên 35/318; EdNet chiếu từ tag 94/643.
- Phương tiện và di chuyển liên quan: tag [10, 12]; crawl ứng viên 31/318; EdNet chiếu từ tag 53/643.
- Đồ vật, trạng thái và bố trí: tag [6, 11, 17, 18]; crawl ứng viên 95/318; EdNet chiếu từ tag 168/643.
- Phong cảnh và môi trường ngoài trời: tag [20]; crawl ứng viên 44/318; EdNet chiếu từ tag 23/643.

## Độ phủ toàn bộ EdNet

- all: xuất 13169/13169 dòng; 11844/13169 có nhãn nội dung ứng viên; 7052 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.
- p1: xuất 643/643 dòng; 589/643 có nhãn nội dung ứng viên; 0 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.
- p2: xuất 1662/1662 dòng; 1646/1662 có nhãn nội dung ứng viên; 0 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.
- p3: xuất 1266/1266 dòng; 1254/1266 có nhãn nội dung ứng viên; 0 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.
- p4: xuất 1158/1158 dòng; 1152/1158 có nhãn nội dung ứng viên; 0 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.
- p5: xuất 5703/5703 dòng; 5140/5703 có nhãn nội dung ứng viên; 5140 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.
- p6: xuất 1335/1335 dòng; 898/1335 có nhãn nội dung ứng viên; 777 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.
- p7: xuất 1402/1402 dòng; 1165/1402 có nhãn nội dung ứng viên; 1135 câu có mapping cho mọi tag gốc; 0 câu được kiểm định ngữ nghĩa độc lập.

## Quy tắc sử dụng

OWN IDs được hash từ trục và mã nhãn, không tái sử dụng numeric tag EdNet. Giữ scope từng thành viên và mọi tag gốc.
Part 1 gộp sinh hoạt, mua sắm và công việc ở nhóm hoạt động để giảm độ chi tiết. Đây là parent thô, không đồng nghĩa kỹ năng con.
Luật đọc đúng choice đã được nguồn đánh đáp án; không đọc distractor để tạo nhãn. Từ khóa chỉ là gợi ý text, chưa xem ảnh.
Các câu ngoài luật có thể được assistant đọc text trong part1_text_reviews.json, khóa exact correct_text và rationale; không coi là người dùng duyệt hoặc independent gold.
Các nhóm có thể đa nhãn. Tổng phần trăm không cần bằng 100%. Không coi mọi dòng export là đã hoàn thiện mapping.
Muốn phủ đủ ngữ nghĩa cần tìm nội dung EdNet còn thiếu hoặc kiểm duyệt các bằng chứng khác. Không thể chứng minh nghĩa của tag chưa có neo chỉ bằng đồng xuất hiện.
File own_pending_review.csv là danh sách công việc còn lại. Giữ trạng thái chưa hoàn tất thay vì báo bộ tag cuối cùng.
