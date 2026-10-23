# Đối chứng pyBKT / pyKT với DAS3H

Thực nghiệm riêng trên nhánh `codex/adaptive-recommendation`. Không ghi database, không thay trọng số hay cấu hình model đang phục vụ. Dùng mã nguồn thật của **pyBKT 1.4.3** và lớp **DKT của pyKT 0.0.38**; không gọi một implementation tự viết là thư viện gốc.

## Dữ liệu và đánh giá

- Đọc cache đã kiểm toán: `ednet_santa_mapping_clean/data/interaction_cache/u3000_e0_s2026.csv.gz`. 3.000 học viên / 413.744 lượt đã nộp, không phải toàn bộ EdNet KT4.
- Mapping OWN được giữ nguyên và có trạng thái `research_candidate_not_final`. Kiểm tra hash catalog so với manifest trước khi chạy.
- Seed 42, chia theo học viên 70/15/15 giống thí nghiệm DAS3H: 2.100/450/450 học viên; 281.250/66.647/65.847 lượt. Không có học viên trùng giữa các tập.
- Đây không phải question-disjoint hay global calendar holdout. Lịch sử trước đó của chính học viên validation/test vẫn được cập nhật online sau khi dự đoán mỗi timestamp.
- Tất cả câu cùng timestamp được dự đoán trước khi cập nhật đáp án của timestamp đó. Đánh giá tại lúc nộp; cache không đủ để khẳng định đây là dự đoán tại lúc bắt đầu làm câu hay đánh giá chính sách recommendation.
- Câu đa khái niệm được giữ đủ. BKT và DKT lấy trung bình xác suất theo khái niệm để trả một dự đoán cho một lượt trả lời. Chỉ tính một hàng metric cho mỗi lượt, tránh nhân số lượt do nhiều tag.
- Log loss dùng xác suất clip trong `[1e-7, 1-1e-7]` cho cả ba model; AUC/Brier dùng xác suất gốc, accuracy lấy ngưỡng 0,5.
- 1.325 câu trong catalog chưa có nhãn OWN. Không loại các lượt này để làm đẹp kết quả; BKT/DKT dùng token `__UNTAGGED__` chung, không diễn giải nó là kỹ năng thật. Có 28.948 lượt của cohort thuộc nhóm này. DAS3H dùng item bias cho câu không có tag; sự khác biệt biểu diễn này cần được giữ trong phần giới hạn.

## Model

### pyBKT

Dùng `pyBKT.fit.EM_fit` và khởi tạo `random_model_uni` chính thức, 2 lần khởi tạo/khái niệm, tối đa 40 vòng EM, ngưỡng dừng 0,005 theo log-likelihood huấn luyện. Chọn khởi tạo theo likelihood train, không chọn bằng test. Cố định forgetting bằng 0; các tham số prior/learn/guess/slip được học theo khái niệm. Khái niệm không xuất hiện trong train dùng prior cố định được khai báo trong code.

Bộ lọc online được bọc riêng để đóng băng trạng thái cả timestamp; có test khớp dự đoán thư viện gốc khi timestamp không trùng. **Giới hạn:** quá trình EM của thư viện vẫn xem các quan sát concept trong train theo thứ tự câu xác định, kể cả các câu trùng timestamp. Đây không phải likelihood batch đa quan sát chính xác. Không dùng test để sửa hoặc chọn giả định này sau khi thấy kết quả.

### pyKT DKT

Nạp trực tiếp file `pykt/models/dkt.py` từ wheel đã ghim phiên bản bằng `importlib`, tránh kéo mọi model và dịch vụ tracking không dùng tới qua `pykt.models.__init__`. Mã nguồn upstream không sửa; báo cáo ghi hash file này.

- LSTM unidirectional, hidden/embedding 64, dropout 0,2, Adam 0,001; clip gradient 5.
- CPU, 2 threads; seed và thuật toán deterministic.
- Cửa sổ mục tiêu khoảng 192 interaction concept, ngữ cảnh trước khoảng 64; không cắt một timestamp. Kích thước thực có thể lớn hơn để giữ cả nhóm. Không mang hidden state qua cửa sổ.
- Mỗi concept token trỏ tới output cuối của timestamp trước; nhóm đầu tiên dùng bias đầu ra trên hidden 0. Loss concept được cân `1 / số tag` để mỗi lượt có tổng trọng số 1.
- Tối đa 15 epochs, patience 4; checkpoint chọn theo validation log loss. Test chỉ được chấm sau khi checkpoint đã được chọn. Đây là baseline DKT với bộ huấn luyện/mask thích nghi cho dữ liệu này, không phải tái lập đầy đủ pipeline benchmark mặc định của pyKT hay benchmark AKT/SAKT.

## Chạy lại

Dùng Python 3.12 và PyTorch CPU hiện có (lượt chạy ban đầu: `2.14.0+cpu`). Bộ scientific Python riêng được ghim vì pyBKT pure Python không tương thích NumPy 2.x. Không cài đè thư viện toàn máy:

```powershell
$benchmarkPython = 'C:/Users/vanho/AppData/Local/Programs/Python/Python312/python.exe'
& $benchmarkPython -m pip install --target experiments/kt-benchmark/.runtime --no-deps -r experiments/kt-benchmark/requirements.txt
& $benchmarkPython experiments/kt-benchmark/test_benchmark.py
& $benchmarkPython -u experiments/kt-benchmark/run.py --model bkt
& $benchmarkPython -u experiments/kt-benchmark/run.py --model dkt
& $benchmarkPython experiments/kt-benchmark/compare.py
& $benchmarkPython experiments/kt-benchmark/publish.py
```

Runtime còn sử dụng các dependency có sẵn của môi trường Python như PyTorch, python-dateutil, joblib, threadpoolctl. Xem phiên bản môi trường trong báo cáo. Khi dựng máy mới cần cài các dependency này trước; requirements ở đây là các phiên bản override riêng, không phải lockfile toàn môi trường.

Mỗi model có `*-progress.json` và `*-report.json`; báo cáo hoàn tất có `status=complete`. File checkpoint, tham số và artifacts được Git ignore. Không ghi learner IDs hoặc lịch sử trả lời vào báo cáo tổng hợp. Nếu chạy lại, chỉ định `--output` mới; runner từ chối ghi đè báo cáo đã hoàn tất để tránh vô tình retune trên test cũ.

`compare.py` chỉ tổng hợp khi hai model hoàn tất, cùng hash nguồn, cùng seed và cùng mẫu số đánh giá với DAS3H. Nó chạy lại inference từ artifact DAS3H cố định và đòi metrics khớp thí nghiệm trước trong sai số `1e-9`; không dùng số trong README thay cho kiểm chứng.

Sau đó chương trình tải lại đúng tham số BKT/checkpoint DKT đã chọn, kiểm tra metrics khớp báo cáo hoàn tất và tính khoảng tin cậy cho chênh log loss bằng 1.000 lần bootstrap theo học viên. Việc chạy lại inference này không chọn lại model hay siêu tham số. CI chỉ mô tả biến thiên học viên trên tập test cố định, không bao gồm bất định do huấn luyện lại hoặc taxonomy. Kết quả theo Part/có nhãn/chưa có nhãn là mô tả phụ, không dùng để retune model.

## Kiểm tra và diễn giải

`test_benchmark.py` kiểm tra tách học viên, chặn nhãn hiện tại/tương lai và nhãn của câu cùng timestamp, không chia sẻ trạng thái giữa học viên, trọng số/hợp nhất câu đa tag, độ phủ cửa sổ, fit pyBKT thật, parity bộ lọc BKT với upstream và giá trị metrics.

So sánh này có một split seed trên cohort và test đã được nghiên cứu trước đó; không phải external replication, không phải thử nghiệm tăng điểm người học. Hai model có biểu diễn và ngân sách tuning khác nhau. Không dùng riêng AUC để thay model đang chạy; cần xem log loss, Brier, hiệu chỉnh xác suất, độ ổn định nhiều seed và chi phí phục vụ. Nhánh này không tự kích hoạt BKT/DKT.

## Lượt chạy 22/10/2026

Đã huấn luyện trên dữ liệu thật và tải lại các artifact cố định để kiểm chứng inference. Test: 450 học viên, 65.847 lượt; 12 kiểm thử hợp đồng đạt. Kết quả local `results/seed42.json`, fingerprint nguồn và checkpoint được giữ riêng, không đưa lên GitHub.

| Model | AUC ↑ | Log loss ↓ | Brier ↓ |
| --- | ---: | ---: | ---: |
| OWN DAS3H d=0 | 0,703701 | 0,579725 | 0,197895 |
| pyBKT | 0,595211 | 0,623643 | 0,216607 |
| pyKT DKT | 0,608319 | 0,621104 | 0,215390 |

DKT chọn epoch 10 từ 14 epoch đã chạy bằng validation; không chọn checkpoint bằng test. BKT có **44/93 fit chạm giới hạn 40 vòng EM**, nên chưa xác nhận hội tụ cho các fit đó. Đây là kết quả baseline có ngân sách giới hạn, không chứng minh BKT hoặc các deep KT đã tối ưu đều kém DAS3H.

Chênh log loss so với DAS3H: BKT `+0,043918`, CI 95% theo học viên `[+0,036142; +0,049557]`; DKT `+0,041378`, CI `[+0,033196; +0,047329]`. Các khoảng này chỉ áp dụng cho những fit và cohort cố định đã nêu.

Kết quả hiện tại hỗ trợ **giữ DAS3H đang phục vụ**. Muốn kết luận rộng hơn cho khóa luận cần một kế hoạch nhiều seed và ngân sách tuning/kiểm tra hội tụ được đặt trước, cùng đánh giá trên dữ liệu độc lập. Thời gian trong JSON gồm chuẩn bị/đánh giá và hai job CPU chạy đồng thời; không dùng để so tốc độ inference.

Nguồn: [pyBKT](https://github.com/CAHLR/pyBKT), [pyKT](https://github.com/pykt-team/pykt-toolkit), [DKT upstream](https://github.com/pykt-team/pykt-toolkit/blob/main/pykt/models/dkt.py).
