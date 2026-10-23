# Gợi ý xuyên các phần học và đường cong ghi nhớ

Ngày 23/10/2026, nhánh `codex/integrated-learning` bổ sung gợi ý tại thư viện Lý thuyết, Từ vựng, Luyện nghe, Luyện đọc và tổng hợp tại trang gợi ý. Mỗi mục mở bài/thư mục/phiên học thật, có lý do cụ thể. Không cần migration hoặc huấn luyện lại để dùng phần giao diện mới.

## Phối hợp HLR với DAS3H

[HLR của Duolingo](https://github.com/duolingo/halflife-regression) mô hình hóa xác suất nhớ bằng `p = 2^(-t/h)`, với half-life được học từ đặc trưng. [DAS3H](https://arxiv.org/abs/1905.06873) biểu diễn lịch sử luyện kỹ năng theo cửa sổ thời gian trong dự báo làm đúng câu hỏi. Hai model có mục tiêu và đơn vị dự báo khác nhau. Quyết định thiết kế ở đây là phối hợp ở lớp chọn hoạt động, không nhân hai xác suất hoặc gán mọi hoạt động thành một quan sát DAS3H.

Code HLR có sẵn của hệ thống dùng đặc trưng `[1, sqrt(wins), sqrt(losses)]`. Khi chưa có artifact qua release gate, trọng số `[1,1,-1]` chỉ là prior kỹ thuật thử nghiệm, chưa được fit theo người dùng; không phải hệ số được lấy từ paper. Lịch sau gõ đúng nhắm mức nhớ 80%, giới hạn 10 phút–30 ngày; gõ sai quay lại sau 10 phút. Tự đánh giá tiếp tục dùng lịch cố định, không trở thành nhãn nhớ đúng dùng để fit HLR.

Phần mới trả `memory` trong API danh sách reviews của thư mục: xác suất hiện tại, half-life, model source và thời điểm luyện. Chỉ có ước tính khi nội dung thẻ chưa đổi, có lượt gõ đáp án, counters hợp lệ và mốc luyện không ở tương lai. Trường hợp tự đánh giá hoặc thiếu bằng chứng trả xác suất `null`. Không gửi content hash, counters thô hoặc đáp án trong phần metadata này.

Trong chế độ thẻ tập trung, đường cong hiển thị mức nhớ hiện tại và dự báo sau 1/7 ngày nếu chưa ôn. Khi trang mở lâu, phép chiếu giảm theo thời gian mà không cần gọi mạng liên tục. Sau ôn, lấy lại trạng thái từ server. Đường cong là dự báo, không phải chứng minh người dùng đã nhớ hay quên.

## Quy tắc chọn hoạt động

`GET /mastery/activities` yêu cầu JWT và vai trò người học. Response chỉ có tiêu đề, đường dẫn nội bộ, lý do, nguồn bằng chứng, ưu tiên và hạn ôn nếu có. Mỗi phần tối đa ba mục.

| Phần | Bằng chứng và lựa chọn |
| --- | --- |
| Lý thuyết | Kỹ năng đã luyện có dự báo DAS3H dưới 0,65; bài có đúng skill và chủ đề tương thích. Không gọi kỹ năng chưa luyện là yếu. |
| Từ vựng | Nhóm thẻ đã đến hạn trong thư mục được phép xem; số thẻ có dự báo nhớ dưới 80% giúp mô tả nhu cầu ôn. Mở thẳng thư mục với bộ lọc đến hạn hiện có. |
| Luyện nghe | Lấy kết quả mới nhất của từng đoạn trong lịch sử gần đây. Cần ít nhất ba đoạn cùng nguồn, mức khớp văn bản trung bình dưới 65%; mở phiên học liên quan. Không dùng SPEAK/shadowing làm điểm nghe; mức khớp không phải chẩn đoán năng lực nghe. |
| Luyện đọc | Từ bài đã nộp, lấy câu trả lời mới nhất mỗi version/câu, cần ít nhất ba câu cùng dạng và tỷ lệ sai trên 35%. Hoặc dùng mapping hẹp từ kỹ năng DAS3H: ý chính/mục đích, chi tiết, suy luận, diễn đạt tương đương. Chọn bài thực sự có dạng câu đó, ưu tiên version chưa xuất hiện trong lịch sử gần đây. |

Không bịa liên kết theo tên từ vựng hay nguồn nghe để khẳng định cùng kỹ năng. Hiện từ vựng và nghe dùng bằng chứng riêng của chính phần đó; chưa có mapping chuyên môn đủ tin cậy để đưa mọi kết quả vào DAS3H. Các ngưỡng trên là heuristic có thể kiểm tra, chưa được tối ưu bằng thử nghiệm học tập.

Gợi ý xuất hiện tại thư viện của từng phần, không chen vào phiên nghe/đọc đang làm. Khi chưa có bằng chứng, chọn bài bắt đầu theo quy tắc ở dưới và ghi rõ đó là khám phá, không kết luận yếu. Chỉ hiển thị trống khi không có nội dung phù hợp được phép xem. Gợi ý lỗi mạng có nút thử lại và không chặn học.

### Đồng bộ điểm bắt đầu và hồ sơ học

Luồng trên đã được mở rộng: chưa có lịch sử riêng của từng phần vẫn nhận được bài **Bắt đầu / Khám phá** khi có nội dung được phép xem. Trạng thái trống chỉ còn khi không có tài nguyên phù hợp. Bốn thư viện dùng chung tiêu đề “Gợi ý học cho bạn” và hồ sơ học, không cần đi qua trang gợi ý trung tâm. Khi cửa sổ lấy lại focus hoặc nhận sự kiện `learning-progress-updated`, giao diện tải lại gợi ý; chưa có broadcast xuyên tab.

`learnerProfile` có định hướng unassessed/foundation/developing/consolidating. Chỉ xét kỹ năng đã luyện có xác suất hợp lệ, ít nhất hai kỹ năng và tổng mười lượt theo kỹ năng để đưa ra định hướng ngoài unassessed. Trung bình các kỹ năng dưới 0,65/0,85 chia các nhóm còn lại. Đây là heuristic sản phẩm, không phải CEFR, TOEIC hoặc kết quả chẩn đoán chuẩn hóa; tổng lượt theo kỹ năng có thể chứa nhiều tag của cùng một câu.

Ưu tiên hiện có vẫn đứng trước bài khám phá: kỹ năng yếu, đến hạn từ vựng, lỗi nghe/đọc. Lý thuyết khi chưa có bài yếu phù hợp chọn chủ đề chưa luyện trước; từ vựng bổ sung thư mục có thẻ chưa luyện, ưu tiên thư mục riêng của người dùng và nhóm nhỏ. Nghe bổ sung nguồn có transcript tiếng Anh READY, ưu tiên đoạn đầu ngắn; không gọi độ dài là độ khó. Reading ưu tiên nhãn độ khó thư viện EASY/MEDIUM/HARD theo bằng chứng kỹ năng Part 7 (không dùng điểm ngữ pháp Part 5 để kết luận năng lực đọc hiểu); chưa đủ bằng chứng ưu tiên EASY. Nếu không có bài đúng mức, lý do chỉ nói bài hiện có, không giả nhận đó là mức phù hợp được xác nhận. Từ vựng và nghe chưa có nhãn độ khó chuyên môn nên không tự nhận là đã khớp trình độ.

Các mục starter có `evidence=starter`, `priority=diagnostic`, không khẳng định người dùng yếu. Catalog bổ sung giới hạn 100 thư mục và 100 nguồn nghe; điều kiện quyền áp dụng ngay trong truy vấn.

Kiểm chứng bản mở rộng: 11 unit tests liên quan stage/activities đạt, lint và build backend/frontend đạt, 30 lượt browser desktop/mobile đạt, PostgreSQL integration đạt cả người đã luyện và người mới hoàn toàn. Review độc lập kiểm tra quyền và việc giữ ưu tiên focus/review trước starter; đã sửa assertion cũ không còn khớp danh sách được bổ sung. Chưa phát hành lên web đang chạy.

## Giới hạn và riêng tư

- Đọc tối đa 500 trạng thái ôn theo hạn, 200 câu trả lời nghe mới nhất, 30 lượt nộp Reading, 100 bài có version đang truy cập và 2.000 bài lý thuyết. Đây là cửa sổ gợi ý hữu hạn, không phải toàn bộ lịch sử. Số thẻ trong lý do là số trong cửa sổ đó.
- Chỉ tải tối đa 100 version Reading được chọn, không tải các bản nháp cũ. Lọc thư mục riêng, nguồn nghe bị gỡ/không còn công khai và bài đọc riêng theo quyền người dùng. API bài học đích tiếp tục tự kiểm tra quyền.
- Không thêm ghi mastery, thay trọng số hoặc tính một câu thành nhiều lượt học. Dữ liệu thật và artifacts tiếp tục ở ngoài Git theo cấu hình riêng tư hiện có.

## Hướng nghiên cứu tiếp

1. Tạo mapping resource–skill do người biên soạn xác nhận cho từ vựng, đoạn nghe và bài đọc. Lưu nguồn mapping, phiên bản và độ tin cậy; không dùng suy đoán LLM chưa duyệt làm nhãn chuẩn.
2. Dùng sự kiện tự gõ đã lưu để fit/đánh giá HLR theo người học tách biệt, chặn nhãn tương lai; so với lịch cố định và baseline FSRS. [FSRS](https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm) mô hình hóa difficulty, stability và retrievability; chưa đưa FSRS vào production chỉ vì model mới hơn.
3. Đánh giá độ hiệu chỉnh xác suất nhớ, log loss/Brier, tỷ lệ quá hạn và tải ôn; dữ liệu thưa phải giữ prior hoặc fallback rõ ràng.
4. Sau khi mapping ổn định, hợp nhất sự kiện học có ID chống trùng và provenance. Chỉ bài có kết quả đo được, đúng contract model mới có thể cập nhật KT; việc mở lý thuyết không tự chứng minh thành thạo.
5. Đánh giá gợi ý bằng mức giữ nhớ sau độ trễ và bài kiểm tra độc lập, có nhóm đối chứng. Tỷ lệ click hoặc tăng điểm simulator chưa chứng minh tăng năng lực TOEIC.

## Kiểm tra

`npm run check` kiểm tra lint, unit tests và build. Các test mới nằm tại `activities.service.spec.ts`, `memory-state.spec.ts` và `frontend/test/browser/integrated-activities.spec.ts`. `node test/learning.integration.cjs` từ backend sau build kiểm tra query thật trong schema PostgreSQL tạm, gồm lọc thư mục riêng và nguồn nghe đổi quyền. Browser tests dùng API giả lập để kiểm tra luồng giao diện và liên kết.

Lượt kiểm chứng 23/10/2026: `npm run check` đạt (64 suites/340 backend tests, 65 frontend tests, lint và hai build); 24 lượt browser desktop/mobile đạt; PostgreSQL integration đạt. Đã xem ảnh mobile đường cong, desktop/mobile gợi ý. Review riêng đã phát hiện và xác nhận sửa truy vấn tải phiên bản thừa; không còn major/blocker trong phạm vi review. Các vai trò editor/reviewer cấu hình riêng không có trong phiên nên dùng agent frontend editor và reviewer tập trung thay thế. Cảnh báo chunk Three.js lớn có từ trước vẫn còn. Chưa commit/push hoặc triển khai thay đổi này.
