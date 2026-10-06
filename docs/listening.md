# Listening

Listening dùng NestJS, Prisma và BullMQ hiện có. Bài làm nằm trong ListeningSession/ListeningAnswer; không gọi DAS3H hoặc cập nhật năng lực.

## Chạy và chuẩn bị ASR

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
