# Thực nghiệm lập kế hoạch chọn kỹ năng

Tham khảo [ExRec upstream](https://github.com/oezyurty/ExRec): KT làm môi trường mô phỏng để tối ưu việc chọn bài. Đây là bộ lập kế hoạch BKT nhỏ, chạy riêng bằng Python standard library; **không phải tái lập ExRec MVE, model semantic KT hoặc agent RL đã huấn luyện**. Không nối vào API chọn bài và không thay DAS3H.

## Đã triển khai

- Đọc tham số pyBKT từ thí nghiệm KT đã hoàn tất. Chọn tám concept có nhiều quan sát train nhất trong các fit dừng trước giới hạn EM, bỏ `__UNTAGGED__`; không chọn theo kết quả test. Còn 44 fit chạm giới hạn trong nguồn, bị loại khỏi panel.
- Một hành động là một cơ hội luyện một concept tổng hợp. Tính xác suất đúng theo BKT, Bayes cập nhật sau kết quả rồi áp dụng xác suất học. Không đồng nhất hành động này với câu hỏi TOEIC thật, không có difficulty, multi-tag, kiến thức nền hoặc quên theo thời gian.
- So sánh random, weakest (mastery thấp nhất) và lookahead2 (duyệt chính xác cây đúng/sai hai bước, chọn tổng thay đổi kỳ vọng trung bình belief cao nhất). Không học policy bằng gradient hay RL.
- 3 seed × 3 chính sách × 3 mức nhân learning rate (0 / 0,5 / 1), mỗi cấu hình 50 episode × 20 bước. Các chính sách dùng chung số ngẫu nhiên kết quả theo episode/bước và stream riêng cho chọn action ngẫu nhiên. Mỗi episode bắt đầu lại từ prior của model, không đọc lịch sử học viên test.
- Báo cáo thay đổi belief mô phỏng và độ phủ concept; không xuất dữ liệu từng học viên. Hash nguồn, artifact và implementation giúp xác định lượt chạy. Runner từ chối ghi đè kết quả có sẵn.

Hai bước được tính đầy đủ theo nhánh quan sát, không nhìn trước kết quả ngẫu nhiên. Khi giá trị hòa trong sai số 1e-12, chọn action có chỉ số nhỏ nhất. Policy biết đúng tham số của simulator tại từng mức learning rate: đây là phân tích độ nhạy trong môi trường khớp mô hình, **chưa kiểm tra sai lệch model**.

## Chạy

Sau khi có `experiments/kt-benchmark/artifacts/seed42/bkt-parameters.json` và `bkt-report.json` từ benchmark:

```powershell
$sandboxPython = 'C:/Users/vanho/AppData/Local/Programs/Python/Python312/python.exe'
& $sandboxPython experiments/exrec-sandbox/test_planner.py
& $sandboxPython experiments/exrec-sandbox/run.py --output experiments/exrec-sandbox/results/new-run.json
```

Không cần cài thư viện hoặc gọi AI. Có thể chỉ định `--artifacts` cho một bộ tham số/report hoàn tất khác. Hai file được fingerprint riêng; runner không chứng minh chúng xuất phát từ cùng quá trình fit, nên phải giữ cặp artifact do runner benchmark tạo.

## Kết quả và giới hạn

Lượt chạy local `results/seed42-panel-v2.json` hoàn tất 27 cấu hình. Kết quả và fingerprint nguồn được giữ riêng, không đưa lên GitHub. Bộ kiểm thử có 9 ca: xác suất, Bayes, kỳ vọng learning gain một bước theo công thức, trường hợp không học, nhánh xác suất bằng 0, khác biệt giữa lập kế hoạch và weakest, tái lập seed, không sửa input, chọn panel đúng và kiểm tra tham số.

Khi learning rate dương, lookahead2 có thay đổi belief trung bình cao hơn trong môi trường này nhưng tập trung vào ít concept hơn random. Điều đó không chứng minh tăng điểm TOEIC: reward được định nghĩa bằng chính belief của BKT dùng để lập kế hoạch. Khi learning rate bằng 0, reward kỳ vọng là 0; thay đổi belief từng episode vẫn có thể âm hoặc dương do quan sát Bayes. Độ lệch chuẩn episode chỉ mô tả mô phỏng, không phải khoảng tin cậy cho tác động lên người học thật.

Schema hiện tại lưu câu trả lời nhưng chưa có candidate-set snapshot và xác suất chọn action của behavior policy. Vì vậy không tính IPS/SNIPS hoặc tự dựng propensity từ tần suất lịch sử. Ngay cả có các trường đó, đánh giá dài hạn còn cần kiểm tra overlap, tính đúng của reward, ảnh hưởng chuỗi hành động và thiết kế nghiên cứu phù hợp.

Điều kiện trước khi thử trên người học: thẩm định taxonomy và simulator bằng dữ liệu độc lập; biểu diễn bài thật/độ khó/kiến thức nền; đánh giá lệch model và độ phủ; kế hoạch thử nghiệm có nhóm đối chứng và chỉ số học tập được đặt trước. Trạng thái báo cáo luôn là `deploymentEligible=false`, `causalLearningGainEstablished=false`.
