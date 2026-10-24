# Listening

Listening dùng NestJS, Prisma và BullMQ hiện có. Bài làm nằm trong ListeningSession/ListeningAnswer; không gọi DAS3H hoặc cập nhật năng lực.

## Lối vào học và thêm nội dung

Đầu trang có hai lựa chọn ngang hàng: **Bài nghe có sẵn** và **Thêm video của bạn**. Lựa chọn thứ hai mở form dán link YouTube ngay phía trên, thay cho form bị thu gọn ở cuối trang. Chuyển lựa chọn không tự tạo nguồn hoặc phiên học; chỉ gửi khi nộp form. Bài đang luyện và câu trả lời đang nhập được giữ khi mở form hoặc xem thư viện. Trong lúc gửi/ghi âm, thao tác chuyển bị khóa để tránh ngắt tác vụ.

Chép lời, điền từ và Shadowing là các chế độ bên trong bài nghe, không phải hai nguồn nội dung nói trên. Các đường dẫn source/session và API hiện có được giữ nguyên. Thay đổi giao diện local chưa tự cập nhật web production.

## Chạy và chuẩn bị ASR

### Cập nhật khoảng nghe và điền từ — 06/10/2026

- Khoảng đang nhập nằm riêng trong form; không gọi API theo từng phím. Chỉ áp dụng khi bấm **Luyện đoạn này**, giữ nguyên trình phát và câu đang học trong lúc nhập/xóa số.
- Chế độ điền từ dùng input ngay tại dấu gạch, hỗ trợ Tab, không còn textarea riêng. Đáp án gửi theo thứ tự chỗ trống; cần điền đủ để tránh câu trả lời sau bị dồn vào ô trước. Chép cả câu vẫn dùng textarea. Khi sửa câu trả lời, kết quả cũ được ẩn để không nhầm với lần đang sửa.
- Caption cache trong tiến trình: kết quả 5 phút, lỗi 1 phút, tối đa 64 video; các yêu cầu trùng dùng chung Promise. Metadata audio HTTPS của yt-dlp được tái sử dụng 2 phút, tối đa 32 video; lỗi resolve/download xóa cache. Không lưu URL ký riêng vào log/client.
- Cache transcript trong DB và giới hạn request vẫn giữ nguyên. Không đổi model, beam size, cách chấm hoặc DAS3H. Lần lấy đầu và thời gian xử lý đoạn dài vẫn phụ thuộc mạng/CPU; không cam kết thời gian cố định.
- Đã kiểm tra: 23 unit test backend Listening, 3 test frontend inline, lint/build cả hai, integration nhận dạng audio thật và YouTube worker READY. Browser xác nhận iframe `widget10` giữ nguyên khi xóa/nhập các mốc 12–27, focus không mất; Tab chuyển ô, điền đủ mới bật nút chấm. Không nộp lại bài thật để thử UI.
- Tham khảo bố cục bài nghe theo câu ở [Đậu TOEIC](https://dautoeic.vn/chep-chinh-ta/2972). Bản công khai yêu cầu đăng nhập để luyện; cách điền trực tiếp tại dấu gạch được triển khai theo yêu cầu người dùng.

### Kiểm tra thực tế 06/10/2026 và sửa lỗi

- Whisper cục bộ nhận dạng đủ bốn câu trong `frontend/public/listening-demo.wav`.
- Luồng trực tiếp yt-dlp → ffmpeg → Whisper chạy thành công với `jNQXAC9IVRw` (0–20 giây) và `gOMypAhVaXE` (0–30 giây, tám cues). Đây là bằng chứng cho các đoạn đã thử, không bảo đảm mọi video luôn truy cập được.
- Redis đã bị tắt khi kiểm tra: HTTP có thể chạy nhưng tác vụ transcript không tiến triển. Cần bật Docker Desktop và Redis trước khi dùng hàng đợi; `/health/ready` phải trả `ok`.
- Cấu hình local frontend trỏ cổng 3001 trong khi backend kiểm tra chạy cổng 3000 gây Failed to fetch. Đã thống nhất backend local 3000 và frontend `/api` qua proxy Vite để tránh lệch cổng/CORS; các file `.env` không commit.
- Sửa trường hợp CC tồn tại nhưng không có câu nằm trọn trong đoạn chọn: chuyển sang ASR thay vì lưu READY với đoạn không luyện được.
- Bài thất bại ba lần được phép thử lại sau cooldown một giờ, vẫn áp dụng rate limit. Không khóa vĩnh viễn bài cũ từ thời chưa cấu hình ASR.
- Giao diện chỉ đánh dấu đã cập nhật phiên sau khi tải thành công; yêu cầu bị hủy không làm mất lần cập nhật script tiếp theo.
- Đường dẫn Python helper được giải theo vị trí module, không phụ thuộc thư mục khởi chạy. Kiểm tra model yêu cầu đủ model.bin/config.json/tokenizer.json.
- `LISTENING_REQUIRE_YOUTUBE=true node test/listening.integration.cjs` bật kiểm thử strict: YouTube phải READY, mở được câu luyện và giữ script ẩn trước trả lời. Chạy các lượt integration nối tiếp để tránh dùng chung fixtures.
- Kết quả sau sửa: backend build, 19 kiểm thử Listening, frontend type/build và integration strict đều qua. Integration nhận dạng audio thật, chấm/lưu tiến độ, kiểm tra quyền riêng tư và worker YouTube READY. Trình duyệt đã tải thư viện và hiển thị cả bài có CC lẫn bài nhận dạng audio sẵn sàng luyện. ASR `base.en` vẫn có thể nhận sai từ; chưa đánh giá độ chính xác trên tập audio rộng.

```powershell
npm run db:generate --prefix backend
npm run db:migrate --prefix backend
npm run seed:listening --prefix backend
python -m venv backend/.venv-listening
& backend/.venv-listening/Scripts/python.exe -m pip install -r backend/scripts/listening-asr-requirements.txt
& backend/.venv-listening/Scripts/python.exe backend/scripts/listening-asr.py prepare --model backend/storage/models/base.en
```

Trong `backend/.env`, đặt `LISTENING_ASR_ENABLED=true`, `LISTENING_ASR_PYTHON` là đường dẫn tuyệt đối tới Python trong venv, `LISTENING_ASR_MODEL_DIR` là đường dẫn tuyệt đối tới `backend/storage/models/base.en`, và `LISTENING_FFMPEG` là ffmpeg binary. Chạy backend từ thư mục backend như scripts hiện tại; sau đó `npm run dev:backend` và `npm run dev:frontend`. Bật ASR cần Python 3.10+, ffmpeg và model đã chuẩn bị. Không dùng API trả phí. Model tải một lần; nhận dạng chạy CPU int8, 2 threads, không tải model trong yêu cầu học viên. Venv/model/audio tạm không commit.

Docker runtime đã có Python/ffmpeg và dependencies. Compose có tác vụ `listening-model` chuẩn bị model trước khi backend chạy, lưu qua volume `listening_models`. Khởi tạo cần mạng đến Hugging Face; lần sau dùng model đã lưu. ASR input dùng volume riêng, không nằm trong endpoint media công khai. Chưa kiểm chứng build image Docker trong môi trường này.

## Thêm YouTube và tạo script

1. Lưu link riêng tư. Hệ thống tự chuẩn bị đoạn đầu theo cấu hình (mặc định 180 giây).
2. Ưu tiên phụ đề tiếng Anh thủ công, sau đó tự động qua `youtube-transcript-plus`. Có đường dự phòng lấy track từ watch page/JSON3. Toàn bộ lấy CC giới hạn 15 giây/4 MB.
3. Nếu CC thất bại và ASR sẵn sàng, dùng yt-dlp lấy metadata audio-only HTTPS từ googlevideo.com, rồi ffmpeg đọc đoạn được chọn. Không lưu video hoặc audio của cả bài dài. Mỗi đoạn tối đa 300 giây, WAV mono 16 kHz, tối đa 10 MB; metadata 45 giây, ffmpeg 60 giây, nhận dạng 240 giây.
4. Whisper nhận dạng tiếng Anh với VAD và thời gian từ model, cộng offset đoạn gốc. Không dùng LLM viết transcript. Script được giữ kín trước khi nộp đáp án, UI ghi rõ nguồn tự động có thể sai. Điểm chỉ là so khớp để luyện tập.
5. Nếu YouTube chặn audio phía server, giao diện hỗ trợ thu âm tab qua getDisplayMedia: người dùng chọn đúng tab và bật chia sẻ âm thanh, giữ video phát liên tục ở 1x. MediaRecorder chỉ ghi/upload audio, tối đa 5 phút/10 MB, dừng và giải phóng capture khi rời trang. Mốc đầu lấy từ vị trí trình phát khi phát. Chức năng phụ thuộc hỗ trợ trình duyệt và quyền chia sẻ của người dùng; chưa kiểm chứng capture thực tế trên thiết bị này.
6. Hoặc học viên có thể cung cấp file audio của đúng đoạn mình có quyền sử dụng, không phải script. WAV/MP3/M4A/WebM tối đa 10 MB; server giới hạn/chuẩn hóa đoạn rồi nhận dạng. Audio không được cung cấp qua URL công khai và được xoá sau job, kể cả lỗi thông thường. Process bị crash có thể để lại file input mồ côi cần vệ sinh khi vận hành.

Chọn đoạn khác và bấm Chuẩn bị bài luyện sẽ yêu cầu đúng khoảng đó. `GET /listening/sources/:id?start=...&end=...` trả trạng thái; `POST /listening/sources/:id/transcript` nhận start/end. Khi lời thoại sẵn sàng, phiên chưa có transcript tự gắn phiên bản và giao diện cập nhật. Phiên đã có lời thoại giữ snapshot cũ. ASR được lưu với segmentStart/segmentEnd để không dùng nhầm đoạn. segmentEnd ghi khoảng đã yêu cầu; nếu video kết thúc sớm, cues chỉ đến thời gian audio thực tế.

Không bảo đảm mọi link hoạt động: video riêng tư, yêu cầu xác minh, chặn audio hoặc mạng/HTTP 429 vẫn có thể thất bại. Không dùng cookie tài khoản, không giải CAPTCHA, không tắt TLS. Nếu môi trường cần proxy, Node 24.5+/22.21+ hỗ trợ `node --use-env-proxy dist/main.js`; proxy không bảo đảm YouTube cho phép truy cập.

Tài liệu nguồn: [faster-whisper](https://github.com/SYSTRAN/faster-whisper), [yt-dlp](https://github.com/yt-dlp/yt-dlp), [caption adapter](https://github.com/ericmmartin/youtube-transcript-plus), [IFrame API](https://developers.google.com/youtube/iframe_api_reference).

## Phân quyền, lưu trữ và giới hạn

- Học viên thêm YouTube riêng tư; admin tạo nguồn thư viện audio/video/YouTube dưới dạng nháp rồi xuất bản. Không xuất bản bài cá nhân của học viên.
- API nhập phụ đề chỉ ở `/listening/admin/sources/:id/subtitles` và cần ADMIN. SRT/VTT giữ timestamp; text thuần là một cue trong đoạn tối đa 5 phút/200 từ. Không hiển thị ô nhập script cho học viên.
- Nguồn/phiên/bài làm kiểm tra quyền tài khoản. `POST /listening/sources/:id/audio` chỉ cho chủ bài cá nhân. File nguồn admin là tài nguyên công khai, tối đa 20 MB với tên UUID, hỗ trợ HTTP Range. Audio ASR riêng không dùng endpoint này.
- `DELETE /listening/sources/:id` xoá mềm qua deletedAt, chỉ cho chủ sở hữu. Nguồn và phiên bị ẩn, không truy cập được. `POST /listening/sources/:id/restore` khôi phục nguyên tiến độ. UI có Hoàn tác. Cache audio công khai dùng chung vẫn giữ để không ảnh hưởng người khác.
- Queue concurrency 1 để giới hạn CPU. Cache theo video/en/version/start/end, unique key + trạng thái có điều kiện + job ID chống lặp. Cache mặc định 24 giờ; ba lần thử mỗi range. Transcript upload audio là riêng theo nguồn, không chia sẻ cache giữa học viên.
- Rate limit Redis: nguồn/transcript theo cấu hình; audio ASR upload 3/giờ/tài khoản; phiên 60/giờ, đáp án 240/giờ, báo lỗi/media 10/giờ. SRT tối đa 200 KB/5.000 cues. Temporary ffmpeg WAV bị xoá trong finally.
- Cloze/dictation chấm bằng code, chuẩn hoá chữ hoa/dấu câu/khoảng trắng và một số contractions. Lời thoại tự động có thể sai nên không dùng điểm này cho DAS3H. Chế độ nói lại vẫn là tự đối chiếu, không chấm phát âm; ghi âm microphone chỉ nằm trên trình duyệt, giới hạn 5 MB và thời gian cấu hình.

## Demo và kiểm thử

Bài **Office announcements · bài mẫu** dùng WAV do dự án biên soạn với Microsoft David và timestamp đo theo sample. Seed idempotent, không tạo tài khoản hay sửa trọng số. Mở `/listening` chọn bài mẫu; có thể điền từ, chép câu, lưu kết quả và tiếp tục qua URL phiên.

```powershell
npm run check
# API, Postgres, Redis đang chạy và đã seed bài mẫu:
npm run test:listening:integration --prefix backend
docker compose --env-file .env.example config --quiet
```

Unit tests kiểm tra ưu tiên CC, đường watch-page, fallback ASR đúng range, lỗi không tạo transcript giả và cache không dùng nhầm đoạn. Integration tạo/dọn tài khoản riêng, kiểm tra phân quyền, script ẩn, chấm bài, lưu tiến độ, xoá/khôi phục, admin publish, Range 206 và DAS3H không đổi. Khi ASR sẵn sàng, test upload audio mẫu thật qua HTTP/BullMQ/Whisper và kiểm tra script được giữ ẩn đến lúc nộp bài.

Kết quả môi trường hiện tại: Whisper thực tế nhận dạng được bốn câu từ WAV mẫu; luồng upload audio đến bài luyện và chấm đáp án chạy thành công. YouTube thật vẫn trả lỗi truy cập CC/audio, nên chưa xác nhận được một link YouTube tự động thành công xuyên suốt. Không coi fixture hoặc audio mẫu là bằng chứng mọi video được hỗ trợ.

### Chống mất đầu câu khi nghe lại

Phát sớm 0,75 giây, chặn thời gian âm; mốc dừng/chấm giữ nguyên. YouTube tạm dừng, tua rồi kiểm tra vị trí trước khi phát (chấp nhận keyframe sớm tối đa 2,5 giây, timeout 5 giây có hướng dẫn thử lại). Không dùng vị trí cũ để tự dừng trong lúc tua. Media native kiểm tra seeking/seeked và chỉ báo đã nghe khi playing. Thu audio để ASR vẫn giữ mốc chính xác và tốc độ 1×, không thêm lead-in. TypeScript/lint/build và 2 test mốc phát đạt; đã thử phát lại YouTube và tự dừng ở cuối câu. Chưa đo trên mạng chậm/thiết bị thật; mốc phụ đề sai vẫn cần chỉnh nguồn.
