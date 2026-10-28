# DCL4KT với augmentation: đối chứng nghiên cứu

Nguồn tác giả đã xác minh: [codingchild2424/cl_bert_kt](https://github.com/codingchild2424/cl_bert_kt), [paper LREC-COLING 2024](https://aclanthology.org/2024.lrec-main.438/). Commit ghim `6d2006aeb4b93dae6948936c27d688fce3f60b00`, SHA256 file model `14bd1ada1a7a272935167f6361acc04c8b9fd8259b8721936021e1616c78968c`. Không vendor lại mã upstream; checkout và artifact giữ local.

Đây là **adapter DCL4KT prefix-causal**, không phải tái lập nguyên xi số trong paper. Chưa có kết quả benchmark đầy đủ để xếp hạng với DAS3H. Không tự thay model website.

## Thiết kế so sánh đã định

- Hai nhánh: DCL4KT không augmentation và cùng model có mixed augmentation. Cả hai vẫn có contrastive loss; `base` không có nghĩa tắt contrastive learning.
- Cùng cohort, split learner-disjoint seed 42 và đầy đủ mẫu số như benchmark DAS3H. Seed 42/43/44 là seed khởi tạo/train, **không phải ba split dữ liệu độc lập**.
- Ba seed × hai learning rate `[0.001, 0.0003]` × hai nhánh = 12 fit. Chọn LR/checkpoint bằng validation log loss; hoàn tất toàn bộ fit trước khi mở lệnh test. Tối đa 100 epoch, patience 10.
- Kích thước chính: hidden 512, 4 encoder blocks trên mỗi nhánh, 16 splits (8 attention heads thực), max length 100, dropout 0,1, Adam, CL weight 0,1. Batch mặc định 512. Giảm batch là thay đổi protocol được ghi trong hash; gradient accumulation **không** tạo thêm contrastive negatives như batch vật lý lớn.
- Test: một dự đoán/câu sau mean fusion đa tag. Kiểm tra lại hash/count/split và tái lập inference DAS3H cố định trong `1e-9`; báo AUC/log loss/Brier/accuracy, ba nhóm lịch sử đầu, và CI chênh log loss so với DAS3H bằng bootstrap paired theo learner.
- Không dùng điểm từ paper làm điểm chạy của hệ thống. Không kết luận model nào tốt nhất từ một smoke test, fit chưa hội tụ hoặc ngân sách bị giảm. Không suy ra tăng điểm TOEIC từ prediction metrics.

## Thay đổi cần thiết so với pipeline upstream

1. Mỗi mẫu chỉ chứa lịch sử **trước timestamp hiện tại**, rồi một query có response MASK=2. Câu cùng lượt nộp không thấy đáp án nhau. Không dùng random masked response giữa chuỗi có tương lai khi so với DAS3H online.
2. Câu đa tag tạo query theo từng concept, tổng trọng số BCE/CL bằng 1/câu; inference mean fusion thành một xác suất/câu. Context cắt theo cả nhóm nộp; nếu nhóm cũ quá dài thì bỏ cả nhóm, không cắt một phần. Query đầu và câu chưa có nhãn vẫn được giữ.
3. Vocab và CTT difficulty chỉ fit train. Item/concept chưa gặp dùng unknown token và difficulty 75; **không** gọi đây là DCL4KT+LLM: nhánh dự đoán độ khó bằng văn bản/KoBERT không được triển khai trong adapter này.
4. Augmentation chạy trên toàn bộ tuple `(concept, item, response, conceptDifficulty, itemDifficulty)` để không làm lệch các trường. Có mask, crop, summarize, reverse, permute, segment permutation, replace higher/lower và concatenate. Replace dùng ứng viên cùng concept từ train; giữ response theo giả định augmentation, không coi là dữ liệu thật. Probability cho từng thao tác theo Table 1 setting; kích thước đoạn/mức mask được khai báo trong code và khác cách thao tác theo batch của upstream. Span cutoff không dùng; embedding cutoff 0,03 giữ implementation upstream.
5. Loại các off-diagonal negatives cùng learner trong minibatch; giữ cặp positive và hard negative tương ứng. Đây là adapter cho prefix queries, tránh coi hai prefix cùng người là hai người khác nhau.
6. Loader kiểm hash rồi áp dụng ba thay thế hẹp, không sửa file gốc: `.get_device()` → `.device` để CPU chạy được; pooling compare/positive dùng đúng `mask_i`/`mask_j` sau crop. Giữ cố định padding theo max sequence length để convolution không làm kết quả phụ thuộc độ dài các mẫu khác trong batch.

### Giới hạn quan trọng của mã phát hành

Model upstream có encoder và embedding riêng cho prediction, compare, positive, negative. Qua kiểm tra autograd, contrastive loss không đi trực tiếp vào encoder prediction; nó nối với nhánh prediction qua **shared positional embedding**. Adapter giữ nguyên cấu trúc này, có test ghi nhận chính xác. Không âm thầm nối lại các encoder rồi gắn tên kết quả paper; cũng không được dùng kết quả kém của cấu hình này để kết luận toàn bộ phương pháp DCL4KT hoặc augmentation yếu hơn DAS3H.

## Chạy lại

Dùng scientific Python theo `../kt-benchmark/requirements.txt` và PyTorch tương thích với thiết bị. Không cài đè môi trường toàn máy. Runner không ghi DB, không tải dữ liệu/model lên dịch vụ ngoài. Output phải là thư mục private mới, không đưa lên Git.

```powershell
git clone https://github.com/codingchild2424/cl_bert_kt.git <private-upstream-checkout>
git -C <private-upstream-checkout> checkout 6d2006aeb4b93dae6948936c27d688fce3f60b00

python experiments/contrastive-kt/test_contract.py --upstream <private-upstream-checkout>

# Kiểm tra đường train/checkpoint/test bằng mẫu nhỏ; tuyệt đối không dùng xếp hạng.
python experiments/contrastive-kt/runner.py --data-root <private-data-root> --upstream <private-upstream-checkout> --output <new-smoke-output> --phase train --smoke
python experiments/contrastive-kt/runner.py --data-root <private-data-root> --upstream <private-upstream-checkout> --output <new-smoke-output> --phase evaluate --smoke

# Đo ba batch CPU ở kích thước model chính; mặc định physical batch 32.
python experiments/contrastive-kt/runner.py --data-root <private-data-root> --upstream <private-upstream-checkout> --output <new-profile-output> --phase profile

# Chạy đầy đủ trên máy CUDA đã có runtime phù hợp. Không tự thuê GPU.
python experiments/contrastive-kt/runner.py --data-root <private-data-root> --upstream <private-upstream-checkout> --output <new-full-output> --phase train --device cuda
python experiments/contrastive-kt/runner.py --data-root <private-data-root> --upstream <private-upstream-checkout> --output <new-full-output> --phase evaluate --device cuda
```

Đổi source, plan, device, batch hay dữ liệu sau train sẽ làm hash khác và khóa test. Lệnh evaluate chỉ nhận `trained`/`smoke_trained`; không cho chạy lại để retune trên test. Fit thất bại ghi `failed`. Checkpoint hash được kiểm trước khi tải bằng `weights_only=True`. Full train chưa có resume optimizer/RNG giữa epoch; nếu bị ngắt, giữ output cũ để kiểm toán và dùng output mới cho lượt chạy mới.

## Kiểm chứng local 28/10/2026

- 8 contract tests đạt: causality theo timestamp/current response, learner isolation, mean-fusion weights, nguyên nhóm context, train-only vocab/difficulty, alignment các augmentation, model forward/backward thật, hash gate, padding/batch independence và đường gradient CL.
- Smoke trên mẫu thật tách train/val/test; cả hai nhánh train được, lưu checkpoint chọn bằng validation rồi tải lại đánh giá. Trạng thái `smoke_complete`, không xuất vào leaderboard.
- CPU profile: 418.220 concept-prefix queries / 13.070 batch ở batch vật lý 32; ba bước train đo được khoảng 17,70 / 14,67 / 15,55 giây. Trung vị × số batch ≈ **56,46 giờ/epoch train**, chưa gồm validation/optimizer/cache/early stopping. Đây là ước lượng nhỏ cho cấu hình đo, không ngoại suy thành thời gian GPU hay batch 512.
- Máy hiện có PyTorch `2.14.0+cpu`, không CUDA. Đường CUDA đã có trong runner nhưng **chưa được kiểm chứng trên GPU**. Chưa chạy đủ 12 fit; chưa có điểm DCL4KT được phép so với DAS3H.
