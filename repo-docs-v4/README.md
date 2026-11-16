# repo-docs-v4

Bộ tài liệu vận hành cho AI coding agent (bản v3 đã được sửa): quy trình slice, nhánh `dev`/`main`, và **review bằng AI độc lập, auto-merge không cần user duyệt**.

Thư mục này là **mẫu**, nên `.github/` bên trong chưa chạy trên repo này (GitHub chỉ đọc workflow ở `.github/` ngoài cùng của repo).

## Cách dùng cho một dự án mới

1. Chép toàn bộ nội dung thư mục này vào **gốc** repo của dự án (`AGENTS.md`, `docs/`, `.github/`).
2. Điền "Bối cảnh dự án" (mục 2) và "Cổng gác thực tế" ở cuối `AGENTS.md`; sửa bước "Cổng gác" trong `.github/workflows/ci.yml` nếu không dùng `npm`.
3. Cài đặt repo một lần: default branch = `dev`, branch protection yêu cầu `gate`, `secrets`, `ai-review` và "up to date", tạo nhãn `needs-human`, `do-not-merge`. Chi tiết: `docs/ai-workflow/ai-review.md`, mục "Cài đặt repo một lần".
4. Đọc `AGENTS.md`, rồi `docs/ai-workflow/ai-review.md`.

## Khác bản v3

- Review do phiên AI khác author thực hiện (prompt 23.8), không cần user duyệt từng PR.
- Cổng auto-merge là script có test (`.github/scripts/`), duyệt gắn với head SHA, bắt buộc có CI xanh, kiểm PR chưa tụt sau `dev`.
- Thêm `ci.yml` mẫu và `pull_request_template.md`.

Kiểm tra cổng merge: `node --test .github/scripts/auto-merge.test.js` (chạy trong thư mục này).
