# Gia sư theo bài làm và hybrid RAG — 23/10/2026

## Phần đã triển khai

- Chat và giải thích câu hỏi dùng chung `TutorKnowledgeService`: chỉ lấy KnowledgeChunk có APPROVED, nguồn HTTPS, phiên bản, người/quy trình duyệt và hash đúng nội dung hiện tại. Không coi toàn bộ TheoryLesson hoặc seed cũ là tài liệu đã duyệt.
- Xếp hạng bằng từ khóa không dấu, token đầy đủ, Part/kỹ năng và cosine embedding; hợp nhất thứ hạng bằng RRF. Ngưỡng cosine hiện là 0.65; đây là cấu hình thử nghiệm cần đánh giá lại khi mở rộng corpus.
- Gemini `gemini-embedding-001`, 768 chiều; tách RETRIEVAL_DOCUMENT và RETRIEVAL_QUERY. Vector lưu trong PostgreSQL `KnowledgeEmbedding`, liên kết KnowledgeChunk; model identity bao gồm chiều và phiên bản cách chia đoạn. Không dùng pgvector: exact cosine trên corpus nhỏ, không cần cài extension. Không tuyên bố đáp ứng corpus lớn.
- Chia đoạn theo đoạn văn tối đa khoảng 1.600 ký tự, thêm tiêu đề vào mỗi đoạn. Không chia mất nội dung khi đoạn quá dài. Truy xuất trả tối đa 3 tài liệu cho gia sư; ngữ cảnh mỗi tài liệu giới hạn 6.000 ký tự. Chưa có reranker học máy, chưa tự tối ưu chọn đoạn dài.
- Index được tạo rõ ràng bởi operator; không gọi embedding tài liệu trong request của người học hoặc lúc boot. Lập lại index thay thế atomically, thất bại giữ index cũ. Không dùng vector có hash/model cũ. Nguồn thu hồi hoặc sửa sau duyệt bị loại ngay ở lần truy xuất tiếp theo.
- Không cache embedding câu hỏi cá nhân; chỉ gửi văn bản truy vấn cần thiết tới provider. Khi embedding lỗi, có cooldown 30 giây và vẫn tìm từ khóa trên tài liệu đã duyệt.
- Chat thiếu nguồn phù hợp trả thông báo rõ ràng, không gọi LLM. Chat có nguồn dùng AI thật hoặc báo không khả dụng; đã tắt nhánh mẹo offline ở entry point này. Footer nguồn do server tạo, có URL/phiên bản. Footer không chứng minh mọi nhận định của AI có căn cứ; đây chưa phải bộ kiểm chứng từng câu.
- Giải thích câu hỏi giữ xác thực bài đã nộp/snapshot, dữ liệu kỹ năng theo user, nhãn thiếu dữ liệu và kiểm tra JSON/citation trước hiển thị. Không chẩn đoán trình độ từ một câu hoặc coi DAS3H là phần trăm thành thạo đã được chứng minh.
- Có hành động “Luyện cùng kỹ năng” mở bài thật từ ngân hàng và giữ lời giải khi quay lại; không hứa câu luôn khác vì scheduler hiện chỉ tránh lịch sử gần đây. Có liên kết bài lý thuyết nếu tài liệu gắn lessonId. Năm tài liệu khởi đầu chưa gắn lessonId, nên nút ôn bài không xuất hiện cho chúng.
- GET tìm kiếm kiến thức chỉ dùng từ khóa để tránh gọi embedding ngoài quota POST. Giữ JWT/role, chặn gia sư khi còn bài thi chưa nộp, quota và cancellation hiện có.

## Tài liệu khởi đầu

`backend/prisma/tutor-reviewed-corpus.cjs` chứa 5 tóm tắt tiếng Việt tự biên soạn, ví dụ mới có nhãn minh họa:

1. Although/despite — British Council.
2. Hiện tại hoàn thành/quá khứ đơn — British Council.
3. Thể bị động — British Council.
4. Who/which/that — British Council.
5. Tính từ — Language Portal of Canada.

URL nguồn đầy đủ nằm ngay trong dữ liệu. Đã đối chiếu nguồn sơ cấp khi biên soạn; `reviewedBy` ghi rõ `codex-editorial:primary-source-checked (not expert certification)`. Không giả danh giảng viên đã duyệt. Đây là corpus khởi đầu cho Part 5, chưa phủ toàn bộ TOEIC. Không tự duyệt các mẹo/tỷ lệ không có căn cứ trong seed cũ.

## Sử dụng local hoặc triển khai sau này

Chạy từ thư mục backend sau khi giữ nguyên các khóa/config hiện có:

```powershell
npm run db:generate
npm run build
npm run db:migrate
npm run rag:import              # xem trước, không ghi
npm run rag:import -- --write   # thêm 5 tài liệu editorial; không ghi đè nguồn cũ
```

Thêm `RAG_EMBEDDING_ENABLED=true` và `RAG_EMBEDDING_MODEL=gemini-embedding-001` trong biến môi trường phía server; dùng GEMINI_API_KEY hiện có. Khởi động lại API sau khi đổi cấu hình.

```powershell
npm run rag:index              # xem thống kê, không gọi provider
npm run rag:index -- --write   # embedding thật, có tiêu thụ quota provider
npm run rag:evaluate           # regression từ khóa, không gọi provider
npm run rag:evaluate -- --semantic  # embedding thật cho bộ đánh giá công khai
node test/rag-embedding.integration.cjs
node test/rag-live.cjs --live   # 2 lượt AI thật + tài khoản/câu hỏi local tạm, tự dọn
```

Local đã áp dụng migration, nhập 5 nguồn (ID 17–21 ở database hiện tại), tạo 5 vector và bật flag trong backend/.env bị git-ignore. Không sao chép khóa vào source. Không thay đổi biến production hoặc push/deploy website trong lượt này.

Với tài liệu mới: nhập nội dung/metadata → đối chiếu nguồn → dùng `scripts/review-tutor-knowledge.cjs` ghi nhận người duyệt → lập chỉ mục. Chỉnh sửa nội dung phải duyệt lại và reindex. Không sửa `approvedContentHash` bằng tay để bỏ qua review.

## Kiểm chứng

- Backend hiện tại: 62 suites, 330 tests đạt (bao gồm các thay đổi đã có sẵn trong working tree).
- Frontend: 65 Node tests đạt; lint và build backend/frontend đạt. Còn cảnh báo chunk Three.js đã có trước.
- Browser scoped cho contextual tutor/followup: 4/4 đạt trên desktop/mobile, API fixture có trạng thái. Kiểm tra yêu cầu bài adaptive thật được phát ra, quyền đóng dialog và quay lại lời giải.
- PostgreSQL isolated integration: migration, persistence, reindex idempotent/atomic, semantic hit, thu hồi, sửa hash, index cũ, lỗi provider và cascade đều đạt.
- Live smoke PostgreSQL + Gemini thật: chat có nguồn, câu ngoài phạm vi không được trả lời suy đoán, giải thích trả JSON hợp lệ/citation thật, cold start trung tính và nextPractice đều đạt; hai lượt AI và truy xuất mất khoảng 7,1 giây tổng. Đây không phải p95 hoặc kiểm thử tải.
- Bộ 110 câu tổng hợp trên chính 5 tài liệu: 100 positive (50 câu gốc + biến thể có lời dẫn), 10 ngoài phạm vi. Từ khóa: recall@3 = 0.96, MRR@3 = 0.95, abstention negatives = 1.00. Hybrid live: recall@3 = 1.00, MRR@3 = 1.00, abstention negatives = 1.00.

Kết quả 110 câu là regression tự biên soạn, không phải bộ test độc lập do chuyên gia gán nhãn, không chứng minh hiệu quả học tập hay độ chính xác của mọi câu trả lời. Chưa chấm groundedness từng nhận định, chưa đo chi phí tiền hoặc tải đồng thời; chưa chạy lại full HTTP/Redis integration vì Redis local chưa sẵn sàng. CI được bổ sung integration vector và evaluation không gọi provider.

## Giới hạn và bước tiếp

Ưu tiên mở rộng corpus đã được chuyên gia rà soát cho các Part khác, rồi tạo tập đánh giá độc lập lớn hơn có câu hỏi khó/thiếu ngữ cảnh. Theo dõi sai sót và latency thực tế trước khi tăng topK, thêm reranker hoặc chuyển sang pgvector/ANN. Các kết quả chỉ xác nhận phiên bản local; bản web cần phát hành và kiểm tra riêng.
