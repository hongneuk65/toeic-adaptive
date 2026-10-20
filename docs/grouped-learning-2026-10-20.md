# Tổ chức lại lý thuyết, bài thi và gợi ý học

## Dữ liệu tham chiếu

Đã đọc bản crawl Santa tại `ednet_santa_mapping_clean/outputs/lecture_bridge.json`: 287 bài (Part1:39, Part2:56, Part3:22, Part4:20, Part5:112, Part6:23, Part7:15), gồm tiêu đề, nội dung và metadata. Ví dụ: từ loại, đại từ, thì/thể, liên từ, hỏi đáp, dạng văn bản, chủ đề nghe. Database hiện có 114 bài; lần sửa này phân loại các bài đã nhập, không tự thêm đủ 287 bài hay thay nội dung gốc.

## Phân nhóm

Taxonomy trình bày v1 trong backend/src/mastery/learning-topics.ts: 12 nhóm cho 40 kỹ năng ứng dụng, thay danh sách kỹ năng dài trên giao diện. 92 tag OWN vẫn giữ ở tầng model; không gộp/training lại trọng số DAS3H hoặc thay mapping đã triển khai. Các test skill không thuộc curriculum bị loại khỏi topicGroups.

Nhóm: mô tả tranh; hỏi đáp; nghe ý chính/chi tiết; nghe ngụ ý/hành động; nghe bảng biểu; từ loại/cấu trúc câu; động từ/thì/thể; liên kết câu/đoạn; từ vựng theo ngữ cảnh; đọc ý chính/chi tiết; suy luận/nhiều văn bản; hoàn thiện văn bản.

Đây là nhóm biên tập có phiên bản, chưa phải clustering được chứng minh tối ưu về học tập. Bài học phân loại theo tiêu đề khi nội dung chủ đề rõ, sau đó fallback theo skill. Cần rà soát chuyên môn, nhất là skill legacy gán rộng cho nhiều bài Santa. Một bài có một nhóm chính; Part là bộ lọc độc lập.

## Tính toán

GET /mastery/me bổ sung topicGroups, giữ trường cũ. Trung bình dự đoán của các kỹ năng đã có practiceCount>0; không đưa kỹ năng chưa luyện vào trung bình và không nhân trọng số theo số lần luyện (tránh một kỹ năng lặp nhiều che lấp các kỹ năng còn lại). Đây là ước lượng trên kỹ năng đã quan sát, không phải xác suất thành thạo hay trình độ TOEIC.

Chưa có quan sát: estimatedSuccess=null và đề xuất khảo sát kỹ năng ít được luyện nhất. Có quan sát thấp hơn .65: ưu tiên củng cố. Nhóm có >=50% kỹ năng được luyện và tổng số lượt ở skill>=10 được coi là đủ dữ liệu cho nhãn practiced; đây chỉ là heuristic sản phẩm, số lượt skill có thể trùng cùng câu, không phải chứng cứ độc lập hoặc khoảng tin cậy. Không có quy đổi tăng điểm TOEIC; roadmap cũ bỏ số tăng điểm giả định25/15/5.

Luyện chủ đề bắt đầu kỹ năng được đề xuất rồi luân phiên các kỹ năng thuộc nhóm. Snapshot phiên luyện giữ ổn định khi profile tải lại sau trả lời. DAS3H vẫn chọn từng câu như trước. Gợi ý lý thuyết chỉ lấy bài thuộc cùng chủ đề; bài thi/từ vựng là liên kết vào chức năng có thật, chưa khẳng định mapping từ vựng theo yếu điểm.

## Giao diện

- /theory dùng TheoryReadingPage thực tế, không phải TheoryPage legacy: thư viện chủ đề, tìm không dấu, lọc Part, phân trang12; không tự mở bài. Chế độ đọc toàn chiều rộng và deep link ?topic=&lesson=. Quiz đọc lại đúng bài.
- /exam: hình thức → Part → xác nhận/bắt đầu liền mạch; không hero trang trí hoặc sidebar. Hỗ trợ ?parts=2,3 và ?part=5, kiểm tra hợp lệ và khả dụng bằng catalog.
- /recommendations: tối đa3 ưu tiên,6 nhóm ban đầu + mở thêm/lọc; không tải roadmap cũ hay liệt kê mọi tag. Chưa luyện được ghi rõ chưa đủ dữ liệu.
- Homepage được kiểm tra hash và giữ nguyên.

## Kiểm chứng

Backend build/lint;51 suites229tests gồm phân nhóm, cold start, không tính điểm từ tag chưa quan sát, không thiên lệch số lần luyện, chọn bài cùng chủ đề, phân loại tiêu đề Santa Part6. Frontend build và lint các file thay đổi. Playwright kiểm tra thư viện, deep link/quiz, thi/availability/request,error, recommendation/filter trên desktop/mobile. API thật trả114bài,12nhóm,40kỹnăng; render6màn ở1440px/390px không lỗi JS hoặc tràn ngang. Redis cục bộ vẫn không sẵn sàng; kiểm tra hiển thị/API đọc thành công không đồng nghĩa toàn hệ thống ready.
