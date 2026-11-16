# Review log — <ID Slice/Task> — round <n>

- Ngày: yyyy-mm-dd
- Reviewer (phiên/model): ... — phải KHÁC phiên của author
- Author (phiên/model): ...
- PR: #... — head SHA đã review: ...
- Round: <n>/3

## Kết quả

- [ ] Approved (đặt `ai-review` = success)
- [ ] Changes requested (đặt `ai-review` = failure)
- [ ] needs-human (gắn nhãn, báo user) — lý do: ...

## Bằng chứng tự kiểm tra (reviewer tự chạy, không dựa vào lời author)

- Lệnh cổng gác đã chạy trên head SHA: ... — kết quả: ...
- Diff đã đọc: `git diff dev...HEAD` (n file)

## Checklist (xem `ai-review.md`)

- [ ] Trong phạm vi Slice/Task, import chỉ qua `index.ts`
- [ ] Không drift OpenAPI/contract
- [ ] Migration chỉ thêm, đã test rollback
- [ ] Không bị tắt rule lint / xóa / skip test để làm xanh
- [ ] Test mới chứng minh được hành vi (bugfix: test fail khi bỏ phần sửa)
- [ ] Không secret; input ngoài có validate; log có cấu trúc
- [ ] Đã rebase `dev`, đã xét Slice/Task khác giao nhau; cổng gác xanh sau rebase
- [ ] AGENTS.md feature, file slice, MVP-BACKLOG.md đã cập nhật
- [ ] Phần rủi ro cao (auth, thanh toán, migration phá vỡ, xóa dữ liệu) đã xem kỹ — hoặc không có

## Việc phải sửa (nếu Changes requested)

Mỗi mục: file:dòng — vấn đề — cách sửa mong muốn. Chỉ nêu việc có thể kiểm chứng được.

1. ...

## Nhận xét khác (không chặn merge)

- ...
