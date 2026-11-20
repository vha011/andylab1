# Herk Edit Kit (skill dựng video cho Codex / Claude Code)

Đã thêm bản sao của [nateherkai/herk-edit-kit](https://github.com/nateherkai/herk-edit-kit) vào thư mục [[file:herk-edit-kit|herk-edit-kit]], dùng để dựng video/reels/YouTube Shorts bằng Codex hoặc Claude Code (dựa trên HyperFrames).

## Đã bỏ qua khi tải về

Bản gốc nặng ~787 MB vì có sẵn video mẫu. Hai thư mục sau **không** được chép vào:

- `video-projects/` (286 MB) — 12 dự án giảng dạy có sẵn kèm footage.
- `examples/showcase/` (111 MB) — video demo hoàn chỉnh trong README.

Toàn bộ 15 skill, script, style-library/style-templates, tài liệu `docs/`, và các fixture nhỏ cần cho test (`examples/editing`, `examples/short-form`, `examples/starter`) đều được giữ nguyên. Nếu cần footage/video mẫu đầy đủ, clone lại bản gốc: `git clone https://github.com/nateherkai/herk-edit-kit.git`.

## Cách dùng

```sh
cd herk-edit-kit
npm ci
npm run setup   # tạo .env cục bộ, kiểm tra ffmpeg/node
npm test        # 11/11 test pass đã xác nhận trong sandbox
```

Mở thư mục `herk-edit-kit/` bằng Codex hoặc Claude Code, rồi gọi skill bằng `$edit-video` (Codex) hoặc `/edit-video` (Claude Code). Cần Node.js 22+, FFmpeg/ffprobe, và Chrome/Chromium — cả ba đều có sẵn trong sandbox hiện tại.

Dịch vụ tuỳ chọn (ElevenLabs Scribe để transcribe, Kie.ai để sinh ảnh/video) cần API key riêng, xem `herk-edit-kit/docs/TOOLS-AND-API-KEYS.md`.
