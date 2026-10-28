# Đối chứng mô hình người học

Mục tiêu: kiểm tra lợi ích dự đoán của lịch sử đúng/sai và thời gian trong DAS3H trên cùng cohort. Đây là benchmark offline, chưa đo tăng điểm hoặc hiệu quả của chính sách gợi ý học bằng A/B test.

## Cơ sở nghiên cứu và bằng chứng ứng dụng

| Họ mô hình | Cách hoạt động | Bằng chứng và phạm vi áp dụng |
| --- | --- | --- |
| AFM | Logistic regression theo kỹ năng và tổng số lần luyện | Đối chứng học theo practice count trong dòng LFA/AFM; dùng để xem có cần tách đúng/sai. |
| PFA | Tách số lần đúng và sai cho từng kỹ năng | [Pavlik, Cen & Koedinger, AIED 2009](https://files.eric.ed.gov/fulltext/ED506305.pdf), xây dựng cho adaptive practice. Không có căn cứ ở đây để khẳng định một website cụ thể hiện đang triển khai đúng bản này. |
| Logistic KT | Kết hợp đặc trưng lịch sử và thời gian trong hồi quy logistic | [Pavlik et al., IEEE TLT](https://arxiv.org/abs/2005.00869), [gói LKT chính thức](https://github.com/optimal-learning-lab/lkt). LKT là framework, không phải một công thức duy nhất. |
| Elo | Năng lực tăng/giảm theo chênh lệch giữa kết quả thực và xác suất kỳ vọng | [Math Garden, Computers & Education 2011](https://doi.org/10.1016/j.compedu.2011.02.003); [luận án lưu tại Đại học Amsterdam](https://www.dare.uva.nl/id/67ab8977-5e36-4f9f-962d-be294f2b8c09) xác nhận ứng dụng web sử dụng Elo mở rộng. Bản binary ở repo không tái lập phần response-time scoring của Math Garden. |
| HLR | Xác suất nhớ giảm theo khoảng cách thời gian và half-life được học | [Settles & Meeder, ACL 2016](https://aclanthology.org/P16-1174/), [mã Duolingo](https://github.com/duolingo/halflife-regression). Phù hợp nghiên cứu riêng cho từ vựng; chưa đưa vào cùng bảng TOEIC vì target là recall theo lexeme và cấu trúc dữ liệu khác. Không khẳng định công thức 2016 vẫn là model production hiện nay của Duolingo. |
| BKT / DKT | Trạng thái ẩn Bayesian / mạng LSTM theo chuỗi tương tác | Đã có runner dùng thư viện pyBKT và pyKT thật, xem `experiments/kt-benchmark/README.md`. |

## Các đối chứng mới thực sự được cài

`experiments/kt-benchmark/logistic.py` gồm:

- `afm`: skill intercept + số lần luyện; **có thêm item intercept**, không có learner ID intercept.
- `pfa`: skill intercept + số lần đúng/sai; cùng item intercept như trên.
- `log_pfa`: thay count bằng `log(1 + count)`; ablation tự cài, không gọi là bản PFA nguyên gốc.
- `recency_pfa`: log-PFA + đã từng luyện hay chưa + `log(1 + gap_days)` từ lần luyện skill gần nhất; ablation thời gian tự cài, **không gọi là tái lập LKT logitdec/logitdecevol hay DAS3H**.

`elo.py`: khả năng theo skill, độ khó theo item. `p = sigmoid(mean(skill_abilities) - item_difficulty)`. Cập nhật residual `K * (correct - p)` sau cả nhóm nộp; phần cập nhật skill chia đều theo số skill. Item difficulty chỉ học từ train theo thứ tự thời gian, đóng băng khi đánh giá. Người học mới bắt đầu ability 0. Chỉ một pass train; không diễn giải rating thành điểm TOEIC/CEFR.

Tất cả đối chứng giữ một dự đoán cho một câu, cộng đặc trưng đầy đủ của câu đa tag; nhóm thiếu tag dùng bucket chung `__UNTAGGED__` đã khai báo ở benchmark cũ. Không coi bucket đó là kỹ năng. Item intercept tăng khả năng so sánh với DAS3H vốn đã có item bias nhưng làm các bản AFM/PFA khác specification cơ bản trong paper. Không lấy tên paper để che giấu khác biệt implementation.

## Protocol đóng băng trước khi xem test

- Cùng cohort/split learner-disjoint seed 42 với DAS3H đã lưu. Kiểm tra hashes, số người và số lượt; chạy lại inference DAS3H và yêu cầu metrics khớp `1e-9` trước khi train đối chứng.
- Cả timestamp dự đoán trước khi cập nhật bất kỳ đáp án nào của timestamp; state riêng mỗi học viên. Không đưa learner ID vào feature vector nên người mới không cần fitted learner intercept.
- Logistic: grid C cố định `[0.01, 0.1, 1]`, L2, lbfgs 1.000 iterations; chọn validation log loss trong các fit hội tụ. Nếu không fit nào hội tụ thì dừng, không chấm test. Vectorizer và sparse StandardScaler (không trừ mean) chỉ fit train, unknown item/skill không có hệ số riêng. Scaling không đổi họ hàm tuyến tính nhưng thay hình học regularization. Lượt đầu không scale đã không hội tụ ở cả ba C của AFM và bị dừng trước test; vì vậy thêm scaling cho tất cả đối chứng trước lượt chạy hoàn chỉnh. Artifact đổi hệ số về đơn vị feature gốc, tải lại an toàn không pickle và kiểm tra dự đoán khớp `1e-12`.
- Elo: grid K cố định `[0.025, 0.1, 0.4]`, chọn validation log loss. Item chưa gặp train có difficulty 0.
- Sau chọn model, chấm test đúng một lần. Báo AUC, log loss, Brier, accuracy; chênh log loss và bootstrap paired theo learner 1.000 lần. Không dùng AUC đơn lẻ để chọn production model.
- Báo nhóm có dưới 10, 10–49 và từ 50 câu lịch sử trước timestamp. `first_10` không đồng nghĩa tất cả đều zero-shot: nó gồm những lượt đầu đã có ít lịch sử, và không cắt nhóm nộp ở mốc 10. Đây là held-out learner cold-start, chưa phải unseen-item evaluation.
- Cùng test cũ đã từng xem trước: đánh giá này là nghiên cứu mở rộng mang tính exploratory, không phải test độc lập chưa từng tiếp xúc. Một seed không đủ kết luận model tốt nhất; CI theo learner không bao gồm biến thiên do refit hay taxonomy.
- Ngân sách tuning của DAS3H cố định, BKT/DKT cũ và các đối chứng mới khác nhau. So sánh chung cùng dữ liệu giúp đánh giá các fit cụ thể, chưa phải cuộc thi tối ưu công bằng mọi họ model. Thời gian job gồm tạo đặc trưng và có thể chạy đồng thời; không dùng nó làm benchmark độ trễ phục vụ.

## Chạy

Runtime theo `experiments/kt-benchmark/requirements.txt`. Chỉ định root chứa dữ liệu riêng; source có thể nằm trong worktree khác. Output phải là thư mục local riêng chưa tồn tại, không commit dữ liệu, checkpoints hoặc item parameters.

```powershell
python experiments/kt-benchmark/test_logistic.py
python experiments/kt-benchmark/run_logistic.py --data-root <private-data-root> --output <new-private-output>
python experiments/kt-benchmark/run_elo.py --data-root <private-data-root> --comparison <new-private-output>/report.json
python experiments/kt-benchmark/verify_extended.py --data-root <private-data-root> --report <new-private-output>/report.json --elo-report <elo-output>/elo-report.json
```

Các runner không kết nối database hoặc tự đổi model website. Báo cáo JSON chỉ gồm aggregate metrics/hashes, không learner IDs; file tham số vẫn giữ riêng. Kết quả baseline cũ xem README benchmark, không ghép số từ protocol khác thành leaderboard chung.

Hệ thống đã có `backend/src/flashcard/hlr.ts` và `experiments/hlr/train.py`: đây là biến thể kỹ thuật HLR cho lịch ôn từ vựng, mặc định dùng prior nếu chưa có artifact vượt release gate. Runner ghi rõ dùng binary log loss và đặc trưng căn bậc hai count, không tái lập loss ACL 2016. Sự tồn tại của scheduler này chưa chứng minh nó tốt hơn DAS3H và chưa phải một kết quả benchmark cùng cohort.

## Kết quả kiểm chứng ngày 28/10/2026

Test cố định: 450 người học / 65.847 lượt; train 2.100 / 281.250, validation 450 / 66.647. Toàn bộ 12 fit logistic đã hội tụ; C=0,01 được chọn bằng validation cho cả bốn. Elo chọn K=0,4 từ grid đã định. Cả hai giá trị nằm ở biên grid, nên không khẳng định đã tối ưu hết họ mô hình. Không mở rộng grid sau khi xem test.

| Model | AUC ↑ | Log loss ↓ | Brier ↓ | Log loss ở nhóm dưới 10 câu lịch sử ↓ |
| --- | ---: | ---: | ---: | ---: |
| DAS3H cố định | 0,703701 | 0,579725 | 0,197895 | 0,639413 |
| AFM + item | 0,694167 | 0,607708 | 0,200642 | 0,665219 |
| PFA + item | 0,695216 | 0,607982 | 0,200760 | 0,665634 |
| Log-PFA + item | 0,700992 | 0,602758 | 0,199080 | 0,661995 |
| Recency-PFA + item | 0,701635 | 0,602606 | 0,198974 | 0,661854 |
| Binary skill Elo | 0,681484 | 0,595204 | 0,204378 | 0,648393 |

Nhóm đầu có 4.518 lượt, cùng mẫu số cho các mô hình. Log loss không xếp thứ tự giống AUC: Elo có AUC thấp hơn các logistic baseline nhưng log loss tốt hơn. Đây là lý do phải báo nhiều thước đo.

Chênh log loss đối chứng trừ DAS3H, CI 95% bootstrap theo learner:

| Đối chứng | Chênh | CI 95% |
| --- | ---: | --- |
| AFM | +0,027983 | [+0,020814; +0,033308] |
| PFA | +0,028256 | [+0,019991; +0,034408] |
| Log-PFA | +0,023033 | [+0,016924; +0,027858] |
| Recency-PFA | +0,022881 | [+0,016816; +0,027962] |
| Elo | +0,015479 | [+0,010875; +0,018758] |

Kết quả hỗ trợ giữ DAS3H cho cấu hình/cohort hiện tại. Thêm recency cải thiện log-PFA rất nhẹ trong lượt chạy này; chưa có CI riêng cho chênh giữa hai biến thể nên không kết luận cải thiện chắc chắn. CI trong bảng chỉ so với DAS3H. Không suy rộng thành DAS3H luôn tốt hơn, hay chứng minh recommendation làm tăng điểm.

Đã kiểm tra 7 hợp đồng (causality, nhóm đồng thời, learner isolation, count/gap, iterator parity, Elo item freeze), rồi tái tính test từ artifact của cả năm model. Logistic probabilities khớp khi tải lại trong `1e-12`; metric log loss/Brier/accuracy khớp `1e-10`. AUC dùng dung sai `1e-8` do đổi hệ số về đơn vị gốc có thể làm thay đổi tie ở độ chính xác máy (độ lệch thực quan sát khoảng `5,2e-10`). Dữ liệu, feature names/item parameters và báo cáo JSON chi tiết giữ local, không commit; chỉ mã và tổng hợp này được lưu trong repo.
