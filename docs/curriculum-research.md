# Lộ trình học có dạy kiến thức và ôn luyện — bản thử nghiệm v1

Ngày kiểm tra nguồn: 02/11/2026.

## Phạm vi đã triển khai

Năm chặng trong `backend/src/curriculum/catalog.ts` là nội dung tự biên soạn để chạy thử trên hệ thống, không phải giáo trình ETS/Pearson được cấp phép, cũng không phải một khóa luyện thi toàn diện bảo đảm đầu ra:

- **Nền tảng**: câu đơn → thói quen → hành động đang diễn ra → quá khứ/tương lai → câu hỏi và chỉ dẫn → mục đích thông báo.
- **Mục tiêu 250–450**: từ loại/chủ–vị → thì/bị động → hỏi–đáp gián tiếp → hội thoại và bước tiếp theo → email/liên kết đoạn → tổng hợp lịch và tự chữa lỗi.
- **Mục tiêu 450–650**: mệnh đề/quan hệ logic → paraphrase → ý định và suy luận → thông báo kết hợp lịch → đọc nối nhiều văn bản → bài tổng hợp chuyển giao.

- **Mục tiêu 650–800**: paraphrase/liên kết ý → ý định gián tiếp → thay đổi hội thoại → câu dày thông tin → đối chiếu hai văn bản → vận dụng tổng hợp.
- **Mục tiêu 800–900+**: mức độ cam kết → nghĩa theo ngữ cảnh → timeline nhiều văn bản → nhiều người và điều kiện → ngữ pháp/liên kết đoạn → bài tổng hợp.

Mỗi chặng có sáu bài. Tổng cộng có **30 bài giảng**, **60 ví dụ giải mẫu**, **120 mục từ vựng có câu ví dụ**, **30 đoạn đọc**, **30 kịch bản nghe**, **90 câu luyện có hướng dẫn** và **150 câu kiểm tra**, tất cả viết mới cho dự án. Các bài ước tính 35–60 phút, chưa tính ôn lại và tùy tốc độ thực tế. Đây là tập bài khởi đầu theo từng chặng, **không được quảng bá thành khóa sáu tuần hoàn chỉnh hay đủ để tăng 200 điểm**.

Nội dung tiếng Anh dùng bối cảnh văn phòng, dịch vụ, lịch trình và giao tiếp công việc. Chặng sau giả định đã biết kiến thức câu cơ bản. Người học có thể chọn chặng; trong mỗi chặng, bài trước là điều kiện mở bài tiếp theo. Điều này giúp trình tự rõ ràng nhưng không chứng minh chặng được chọn đúng năng lực thực tế.

## Cơ sở nghiên cứu và giới hạn suy luận

### Ôn sau khoảng nghỉ, ví dụ mẫu và tự nhớ lại

[IES/What Works Clearinghouse, *Organizing Instruction and Study to Improve Student Learning* (2007)](https://ies.ed.gov/ncee/wwc/PracticeGuide/1) khuyến nghị phân bố việc học theo thời gian, kết hợp ví dụ đã giải với bài tự giải, và dùng quiz để tái tiếp xúc kiến thức. Hướng dẫn đánh giá bằng chứng cho spacing và worked examples ở mức moderate, cho quiz tái tiếp xúc kiến thức ở mức strong. Đây là bằng chứng về nguyên tắc học nói chung, **không phải thử nghiệm trực tiếp chứng minh các chặng TOEIC của dự án**.

Áp dụng trong sản phẩm: mục tiêu bài → phần kiến thức → ví dụ phân tích → luyện có giải thích → bài tự làm → phản hồi cụ thể → quay lại sau khoảng nghỉ. Người học cần thử trả lời trước khi xem giải thích, không chỉ đọc lại câu đúng.

[Karpicke & Roediger (2008), *The Critical Importance of Retrieval for Learning*, Science, DOI 10.1126/science.1152408](https://learninglab.psych.purdue.edu/downloads/2008/2008_Karpicke_Roediger_Science.pdf) nghiên cứu việc học từ vựng ngoại ngữ ở sinh viên. Trong thí nghiệm đó, tiếp tục truy hồi sau khi đã trả lời đúng đem lại lợi ích cho kiểm tra nhớ lại trễ hơn so với chỉ tiếp tục học lại. Điều này hỗ trợ việc giữ bài ôn sau lần đạt đầu tiên; **không cho phép dự báo mức tăng điểm TOEIC**.

### Lịch ôn học được từ dữ liệu ngôn ngữ

[Settles & Meeder (2016), *A Trainable Spaced Repetition Model for Language Learning*, ACL](https://aclanthology.org/P16-1174/) trình bày HLR trên dữ liệu Duolingo để mô hình hóa xác suất nhớ. Có thể tham khảo để phát triển lịch ôn từ vựng theo lịch sử trả lời. Không lấy kết quả dự đoán nhớ hoặc tương tác người học của nghiên cứu này làm bằng chứng rằng một giáo trình sẽ tăng điểm thi. **Lịch ôn curriculum v1 hiện tại là chính sách khoảng nghỉ cố định; không gắn nhãn là HLR hoặc DAS3H đã cá nhân hóa lịch này.**

### Khóa và tài liệu chính thức có thể mua để tham khảo

[ETS Global — TOEIC Official Learning and Preparation Course](https://www.etsglobal.org/nc/en/content/toeic-official-learning-and-preparation-course) mô tả ba module, mỗi module 30 giờ, học theo chủ đề và có luyện tập/đánh giá. Dự án tham khảo tư duy chia chặng và phối hợp kỹ năng. **Không có nội dung câu hỏi, audio, giải thích hay đề thi của OLPC được nhập vào catalog này.** Thời lượng của OLPC không phải thời lượng của chặng tự soạn.

[Danh mục chính thức Pearson Japan 2026](https://www.pearson.com/content/dam/one-dot-com/one-dot-com/pearson-languages/en-jp/pdfs/index-pearson-japan-elt-catalogue-2026.pdf) liệt kê *Longman Preparation Series for the TOEIC Test: Listening and Reading, Sixth Edition* theo cấp Introductory, Intermediate và Advanced. Có thể mua tài liệu phù hợp để người soạn hoặc giáo viên nghiên cứu cách triển khai bài học và đối chiếu nội dung. Danh mục xác nhận sản phẩm/cấp độ; **không chứng minh bản chia 250–450/450–650 của dự án tương đương ba cấp sách hoặc đã được Pearson thẩm định**. Không dùng đường dẫn Longman Home cũ nếu đã trả về 404.

Việc mua sách hoặc tài khoản không tự tạo quyền tái bản lên web. [ETS yêu cầu xin phép bằng văn bản cho việc sao chép tài liệu](https://www.ets.org/legal/permissions.html); [Pearson yêu cầu xin phép sử dụng và chuyển thể nội dung sản phẩm](https://www.pearson.com/en-us/global-permission-granting.html). Vì vậy, bản triển khai hiện tại dùng bài tự biên soạn; tài liệu thương mại là nguồn tham khảo cho người soạn, không phải kho sao chép hay đầu vào để sinh lại nội dung khi chưa có quyền tương ứng.

### Khoảng điểm không phải chứng chỉ năng lực

[ETS — Mapping the TOEIC Tests on the CEFR](https://www.ets.org/pdfs/toeic/toeic-mapping-cefr-reference.pdf) đưa ra ngưỡng riêng cho Listening và Reading qua nghiên cứu standard-setting. Ví dụ, ngưỡng B1 được nêu là Listening 275 và Reading 275. Một tổng điểm đơn lẻ không chứng minh cả hai kỹ năng đã đạt cùng mức. Do đó, các nhãn “250–450” và “450–650” ở đây chỉ là **mục tiêu tổ chức chương trình**, không quy đổi thành A2/B1/B2 tự động và không phải một ngưỡng chẩn đoán đã hiệu chỉnh.

DAS3H dự đoán xác suất trả lời đúng trên lịch sử kỹ năng. Xác suất đó không phải điểm TOEIC; không nhân tỷ lệ đúng với 990 hay 495 để cấp một điểm dự đoán chính thức. Checkpoint tự soạn cũng chưa có item calibration, độ tin cậy, equating hoặc nghiên cứu giá trị dự báo cần thiết cho mục đích đó.

## Quy trình học–ôn đang có

1. Người học chọn chặng và quỹ thời gian một ngày. Bài giảng là một đơn vị có thể chia qua nhiều lượt học; số phút là ước tính để sắp xếp, không phải thời gian bắt buộc.
2. Mỗi bài dạy kiến thức bằng tiếng Việt, có ví dụ Anh–Việt được phân tích, từ mới trong ngữ cảnh, một đoạn đọc và một kịch bản nghe gốc.
3. Phần guided dùng ba câu để thử quy tắc/hiểu bài trước khi làm checkpoint; phần giải thích chỉ ra bằng chứng và lỗi thường gặp.
4. Checkpoint có năm câu mới về kiến thức, đọc và nghe. Chấm phía máy chủ; tiến độ được lưu theo người học. Đáp án không gửi trong payload trước khi nộp checkpoint. Kết quả nộp lặp cùng request không được tính thành nhiều lượt mới.
5. Ngưỡng mở tiếp là **80%** trên năm câu, nghĩa là ít nhất bốn câu đúng. Đây là lựa chọn vận hành thử nghiệm, không phải ngưỡng mastery được nghiên cứu hay chứng nhận. Quiz ít câu có sai số lớn, có thể đoán đúng, và không đủ để kết luận đã vững toàn kỹ năng.
6. Sau lần đạt đầu tiên, ôn sau một ngày. Những lần ôn đúng đã đến hạn tiếp theo có khoảng nghỉ ba, bảy và mười bốn ngày tính từ lần ôn tương ứng; nếu đúng đúng hạn, các mốc tích lũy là ngày 1, 4, 11, 25 sau lần đạt đầu. Ôn sớm không được dùng để “ăn hết” các lượt ôn trễ. Ôn đến hạn mà chưa đạt sẽ được hẹn lại ngày sau. Bản v1 kết thúc chuỗi tự động sau bốn lượt ôn đạt, chưa có lịch duy trì dài hạn được cá nhân hóa.
7. Bài ôn đến hạn được ưu tiên trước bài mới, kể cả khi đã đổi chặng. Lịch 1/3/7/14 và ngưỡng 80% đều là chính sách thử nghiệm của sản phẩm, **không được trích dẫn IES/HLR như thể nghiên cứu đã chứng minh đây là thông số tối ưu**.

8. Kế hoạch ngày theo 00:00–24:00 giờ Việt Nam. Mỗi bài đạt trong ngày chỉ tính một lần vào khối lượng ước tính theo thời lượng catalog; làm lại không cộng nhiều lần. Khi đủ quỹ thời gian ước tính, mục hôm nay dừng đề xuất bài mới nhưng vẫn cho người học mở bài đủ điều kiện để học thêm. Đây không phải phép đo thời gian học thực tế.

Câu trả lời chưa nộp được giữ khi chuyển giữa các bước trong cùng lượt mở bài, nhưng chưa lưu bản nháp qua tải lại trình duyệt. Chỉ kết quả đã nộp thành công được lưu bền vững.

Bài ôn dùng lại bộ checkpoint để hỗ trợ ghi nhớ. Vì vậy, điểm tăng qua các lần làm không phải bằng chứng độc lập về chuyển giao; người học có thể nhớ đáp án. Cần ngân hàng tương đương và câu chưa thấy cho đánh giá hiệu quả, không lấy bộ ôn làm bài thi cuối nghiên cứu.

## Nghe và loại bằng chứng được thu

Kịch bản nghe được trình duyệt đọc bằng speech synthesis nếu thiết bị hỗ trợ, không phải giọng ghi âm chính thức hay bản thu chuẩn hóa. Giọng, tốc độ và phát âm thay đổi theo hệ điều hành. Người học cần được thấy nhãn này và có thể xem lời để học khi không nghe được, nhưng điểm sau khi xem lời không được mô tả như đo kỹ năng nghe độc lập. Các hội thoại có nhãn A/B được đọc bởi một giọng tổng hợp, chưa đánh giá được đầy đủ kỹ năng theo dõi nhiều người nói, giọng vùng hoặc điều kiện thi thật.

Các câu tự soạn chưa gắn cùng chuẩn item/skill hiệu chỉnh của kho DAS3H. Vì vậy, tiến độ curriculum lưu riêng, **không bơm kết quả tự soạn thành quan sát DAS3H chính thức**, tránh làm sai so sánh mô hình. Bản v1 ưu tiên bài đến hạn và trình tự kiến thức; cá nhân hóa sâu theo điểm yếu là phần cần nối sau khi có skill mapping được giáo viên duyệt.

## Kiểm định trước khi dùng làm bằng chứng khóa luận

- Nhờ giảng viên/giáo viên TOEIC duyệt mục tiêu, độ khó, tính đúng của tiếng Anh, đáp án duy nhất, tính tự nhiên của các distractor và khả năng nghe của TTS. Trạng thái hiện tại là **bản thử nghiệm tự biên soạn**, chưa được chuyên gia độc lập thẩm định.
- Pilot để xem câu quá dễ/khó, tỷ lệ bỏ bài, thời gian thực tế, tỷ lệ yêu cầu trợ giúp và lỗi do thiết bị nghe. Dùng kết quả đó điều chỉnh thời lượng và nội dung, không dùng nhãn khoảng điểm để giả định item difficulty.
- Tách ngân hàng học, quiz luyện lại và đánh giá độc lập. Bài đầu/cuối cần độ khó tương đương, chưa được học, chấm cùng điều kiện; hạn chế hiệu ứng nhớ đề.
- Nếu so nhóm gợi ý với nhóm tự chọn, giữ cùng quyền truy cập giáo trình và cùng quỹ thời gian đề xuất; ghi thực tế thời lượng, nội dung đã học và adherence. Phân nhóm ngẫu nhiên khi khả thi, phân tích theo nhóm được giao, báo mức chênh thay đổi với khoảng tin cậy và hao hụt mẫu. Nếu không ngẫu nhiên được, báo rõ nguy cơ sai lệch chọn mẫu và khác biệt đầu vào.
- Đánh giá cả chuyển giao đọc/nghe và nhớ từ trễ. Không chỉ báo accuracy dự đoán của DAS3H, số quiz hoàn thành hay phần trăm đúng trên câu đã làm. Chỉ kết luận tăng điểm TOEIC khi công cụ đo điểm đó thực sự phù hợp và nêu rõ giới hạn.

## Checklist nội dung catalog v1

Đã kiểm tra cấu trúc: 30 ID bài duy nhất, 240 ID câu duy nhất, chuỗi prerequisite chỉ trỏ bài trước trong cùng chặng, đủ 2 ví dụ và 4 mục từ mỗi bài, đủ 3 guided + 5 checkpoint, không lặp nguyên prompt guided/checkpoint trong cùng bài, chỉ số đáp án hợp lệ và bốn lựa chọn khác nhau. Mỗi checkpoint có cả knowledge, reading và listening. Vị trí đáp án được phân bố ở cả bốn vị trí, không dồn tất cả vào một lựa chọn. Kiểm tra cấu trúc không thay cho duyệt sư phạm và thử nghiệm với người học.

Chi tiết đối chiếu nguồn và giới hạn hai chặng nâng cao: [advanced-curriculum.md](./advanced-curriculum.md).
