# EdNet × Santa — source-only mapping

Repo nghiên cứu độc lập: bắt đầu lại từ raw crawl và metadata EdNet, không dùng từ điển tag hay kết quả nối cũ.

## Mục tiêu

1. Kiểm kê dữ liệu có thật.
2. Nối ID câu hỏi, kiểm tra Part, đáp án và thành viên bundle.
3. Theo từng tag/Part, đo tỷ lệ nhãn trong câu đã nối; lấy nhãn có tỷ lệ cao, giữ thiếu dữ liệu và mẫu ít.
4. Gom nhãn chi tiết thành nhóm cha đủ khái quát; thử gom tag yếu bằng profile nhưng không tự đặt tên kỹ năng khi thiếu bằng chứng.
5. Notebook trực quan hóa, xuất JSON/CSV và ghi lại pipeline/kết quả bằng Markdown.

## Cấu trúc

```text
config/                    ngưỡng và taxonomy theo mã metadata, không theo ID tag
data/raw/ednet/             questions.csv, lectures.csv
data/raw/santa/             raw content gốc + supplemental
data/source_manifest.json   danh mục file, SHA256, nguồn tương đối
src/pipeline.py             pipeline viết mới, chỉ đọc dữ liệu trong repo
scripts/                   nhập nguồn, tạo/chạy notebook
notebooks/01_mapping.ipynb  quá trình phân tích với kết quả đã chạy
outputs/                   bảng nối, tỷ lệ, mapping và cluster; sinh lại được
docs/PIPELINE.md            phương pháp và công thức
docs/RESULTS.md             kết quả từ lượt chạy mới
docs/DATA.md                nguồn, trường, phạm vi và quyền sử dụng
tests/                     kiểm tra nối, tỷ lệ, gom nhóm và tính độc lập
```

## Cài và chạy

Python 3.10+; pipeline cốt lõi chỉ cần standard library. Notebook cần các gói trong requirements.txt.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -X utf8 -m src.pipeline
.\.venv\Scripts\python.exe -X utf8 -m unittest discover -s tests -v
.\.venv\Scripts\python.exe scripts/create_notebook.py --execute
.\.venv\Scripts\python.exe -m jupyterlab notebooks/01_mapping.ipynb
```

Notebook mặc định đọc output đã sinh. Để tái tính từ nguồn trong notebook, đặt `REBUILD = True` ở cell cấu hình.

Dữ liệu đã được đặt trong repo local này. Chỉ khi cần nhập lại vào checkout mới:

```powershell
python scripts/import_sources.py --source-root D:\NEU\KHOA_LUAN\santa_crawler
```

Importer chỉ lấy raw content và hai CSV EdNet, kiểm tra hash, từ chối ghi đè snapshot khác. Không lấy token, tài khoản, thanh toán, log hoặc mapping cũ. Sau khi có dữ liệu, pipeline không phụ thuộc thư mục cha.

## Cách dùng kết quả

### Bộ tag riêng OWN và Part 1 theo nội dung

Pipeline chạy thêm `src/own_tags.py` để tạo OWN IDs từ trục + nhóm nội dung khái quát, giữ tag EdNet gốc. Part 1 dùng đúng choice để phân nhóm câu crawl; metadata bài giảng neo tag EdNet vào cùng 6 nhóm cha, nhưng không tự chứng minh nội dung câu EdNet cùng ID vì chưa có question bridge. Chi tiết và số liệu ở [docs/OWN_TAGS.md](docs/OWN_TAGS.md).

- `outputs/own_taxonomy.json`: bộ tag riêng, 6 nhóm Part 1 và cluster cha.
- `outputs/own_tag_mappings.csv`: tag EdNet + Part → OWN ID + nguồn.
- `outputs/part1_content_candidates.csv`: đáp án đúng, gợi ý nhóm và trạng thái duyệt text.
- `outputs/ednet_with_own_tags.json` / `.csv`: đủ mọi dòng EdNet với nhãn riêng, nguyên tag gốc và phần chưa rõ.
- `outputs/own_pending_review.csv`: các cặp tag/Part chưa đủ bằng chứng.
- `outputs/own_coverage.csv`: độ phủ nhãn, không nhầm với độ phủ dòng export hoặc accuracy.

Config `part1_content.json` chứa luật minh bạch; `part1_text_reviews.json` chứa một số quyết định assistant đọc text ngoài luật, khóa nguyên đáp án để dừng khi nguồn đổi. Chưa được duyệt hình/audio hoặc độc lập. Notebook có thêm mục 9–10 để trực quan hóa cả hai luồng và tái phủ EdNet.

- `outputs/tag_label_rates.csv`: tỷ lệ, support, bridge coverage, recall, lift và ví dụ theo tag/Part/trục.
- `outputs/mapping_decisions.csv`: nhãn ứng viên cao nhất, near-tie và mức hỗ trợ.
- `outputs/tag_mapping.json`: giữ toàn bộ tag gốc, scope, nguồn và nhóm.
- `outputs/clusters.csv`: nhóm cha cùng nhãn hoặc nhóm profile chưa được đặt tên.
- `outputs/ednet_question_mapping.json` / `.csv`: phép chiếu trên đủ câu EdNet, giữ tag gốc, scope và tag còn chưa rõ.
- `docs/RESULTS.md`: số liệu vừa tính; không chép số từ repo trước.

Không gọi mọi nhãn là kỹ năng: tách task, grammar, topic, format và accent. Không tự chuyển nhãn giọng đọc giữa Part. Nhãn metadata cấp content không phải gold câu hỏi; nhãn bài giảng cũng chưa xác minh câu EdNet lịch sử.

## Pilot DAS3H với tag OWN

```powershell
python -m src.das3h_test --kt4 'D:\path\to\KT4.zip' --users 600 --events 200
python scripts/create_das3h_notebook.py
```

Code độc lập so sánh DAS3H d=0 với tag EdNet, OWN, OWN + fallback và item-only; cùng lượt train/test. Tách người học 70/15/15, 3 seeds; validation chọn regularization. Cửa sổ cộng dồn 1h/1d/7d/30d/vô hạn, không nhìn nhãn cùng batch nộp bài. Notebook `02_das3h_pilot.ipynb` đọc và trực quan hóa kết quả đã chạy; báo cáo `docs/DAS3H_RESULTS.md`.

KT4 không nằm trong repo. `data/interaction_cache/` và `outputs/das3h/private/` bị Git ignore; không publish log người học, user splits hay dự đoán cá nhân. Chỉ aggregate metrics, protocol và biểu đồ được chia sẻ. Mẫu nhỏ là pilot, không chứng minh accuracy ngữ nghĩa hoặc tương đương mô hình.

## Đối chứng thật: EdNet gốc và EdNet đổi nhãn, toàn lịch sử cohort

```powershell
python -m src.das3h_comparison --kt4 'D:\path\to\KT4.zip' --users 3000
python scripts/verify_das3h_comparison.py
python scripts/create_das3h_comparison_notebook.py
```

Chỉ hai biến thể: 188 tag nguồn và 92 tag nội dung OWN trên cùng các lượt làm KT4, không cắt số lượt/người. Mẫu 3.000 người học có tối thiểu 10 lượt hoàn thành/người, **không phải toàn bộ KT4**. Tách người học 70/15/15, 3 seed; chọn C bằng validation, test chỉ dùng chấm kết quả. So cả toàn test, phần có/chưa có mapping và 7 Part. Kiểm tra đọc lại một số log từ ZIP và đối chiếu toàn bộ hàng test trước khi kết luận.

Kết quả độc lập với pilot nằm ở `outputs/das3h_comparison/`, báo cáo `docs/DAS3H_COMPARISON.md`, notebook `notebooks/03_ednet_original_vs_relabeled.ipynb`. Cache log và private predictions/splits bị Git ignore. Script verify nhận `--kt4` để chọn đường dẫn ZIP khi chuyển máy.

## Git và dữ liệu

Repo GitHub `hongneuk65/ednet-santa-mapping-clean` hiện public theo yêu cầu người dùng. Raw content, outputs tổng hợp, mapping/cluster, notebook đã chạy và Markdown kết quả được version cùng snapshot. Có thể sinh lại outputs bằng pipeline; môi trường ảo, cache, log tương tác cá nhân và credential không được đưa lên Git.

Chưa gán giấy phép tái phân phối cho nội dung bên thứ ba. Chỉ dùng bản sao local cho nghiên cứu được phép; kiểm tra điều khoản Santa/EdNet trước khi push public, chia sẻ hoặc thêm media. Không bao giờ commit credential.
