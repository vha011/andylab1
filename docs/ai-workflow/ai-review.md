# Review bằng AI độc lập (không cần user duyệt)

Mỗi PR vào `dev` được duyệt bởi MỘT PHIÊN AI KHÁC với phiên đã viết code. User không phải duyệt từng PR; user chỉ được gọi ở các điểm ở mục "Khi nào mới gọi user".

## Nguyên tắc độc lập

1. Reviewer là phiên/agent mới, KHÔNG dùng lại context của author (thread mới, hoặc subagent loại `review`). Ưu tiên model khác author để không lặp cùng điểm mù.
2. Author không bao giờ tự đặt `ai-review`, không tự approve, không tự merge tay.
3. Reviewer không sửa code của PR. Chỉ đọc, chạy lệnh kiểm tra, ghi review-log và đặt kết quả. Muốn sửa thì trả "Changes requested" kèm danh sách sửa cụ thể.
4. Reviewer không tin lời tự báo của author ("test pass", "đã rebase"): tự chạy lại cổng gác trên đúng head SHA.
5. Kết quả gắn với head SHA. Có commit mới thì duyệt cũ mất hiệu lực và phải review lại.

## Vòng lặp

```
author mở PR (đã qua cổng gác, mô tả đủ theo PR template)
  → author khởi chạy phiên reviewer (prompt 23.8 ở AGENTS.md), rồi chờ (poll PR hoặc đặt wake)
  → reviewer review trên head SHA
      ├─ Approve → đặt status `ai-review` = success → CI xanh → workflow auto-merge squash + xóa nhánh
      └─ Changes requested → status `ai-review` = failure + comment danh sách sửa
            → author (hoặc phiên kế tiếp) sửa trên cùng nhánh, chạy cổng gác, push
            → khởi chạy review lại (round n+1)
  → sau khi merge: ghi sổ (mục "Ghi sổ sau merge")
```

Tối đa 3 round. Round thứ 3 vẫn Changes requested thì dừng, gắn nhãn `needs-human` và báo user kèm tóm tắt bất đồng.

## Checklist reviewer (bắt buộc đi hết, ghi vào review-log)

Đúng phạm vi và hợp đồng
- Diff chỉ nằm trong phạm vi Slice/Task; không refactor lén; import chéo module chỉ qua `index.ts`.
- Contract công khai không đổi giữa chừng; spec OpenAPI và client sinh ra không lệch.

Chất lượng và an toàn
- Tự chạy cổng gác (AGENTS.md mục 7) trên head SHA, kết quả khớp CI. Không có rule lint bị tắt, test bị xóa/skip để làm xanh.
- Có test cho logic mới và đường đi qua dữ liệu thật; test mới thật sự fail nếu bỏ phần sửa (bugfix).
- Không secret; input ngoài có validate; log có cấu trúc, không lộ dữ liệu nhạy cảm; dependency mới có lý do.
- Migration chỉ thêm, đảo ngược được, đã test rollback.

Tích hợp và tài liệu
- Đã rebase lên `dev` mới nhất; đã đọc Slice/Task khác merge vào `dev` từ lúc tách nhánh và PR xử lý giao nhau (mô tả PR có mục này).
- `AGENTS.md` feature, file slice và `MVP-BACKLOG.md` (trạng thái "Review") đã cập nhật; ADR có nếu cần.

Mức rủi ro: nếu đụng auth/phân quyền, thanh toán, migration phá vỡ, hoặc xóa dữ liệu, reviewer phải nêu rõ trong review-log đã xem kỹ phần đó. Không đủ tự tin thì chọn Changes requested hoặc `needs-human`, không "Approve cho qua".

## Cách reviewer đặt kết quả

Dùng `gh` bằng thông tin xác thực đã cấu hình sẵn. `<SHA>` là head SHA đã review (lấy bằng `gh pr view <n> --json headRefOid`).

```bash
# Approve
gh api repos/{owner}/{repo}/statuses/<SHA> -f state=success -f context=ai-review \
  -f description="Approved r<n> by <reviewer-session-id>"
gh pr comment <n> --body-file /tmp/review-<ID>-r<n>.md

# Changes requested
gh api repos/{owner}/{repo}/statuses/<SHA> -f state=failure -f context=ai-review \
  -f description="Changes requested r<n> by <reviewer-session-id>"
gh pr comment <n> --body-file /tmp/review-<ID>-r<n>.md
```

Nếu reviewer dùng được tài khoản GitHub khác tác giả PR, có thể thêm `gh pr review <n> --approve` / `--request-changes`; workflow chấp nhận cả hai cách. Nếu cùng một tài khoản bot thì GitHub không cho tác giả approve PR của chính mình, vì vậy `ai-review` status là đường chính.

File review-log (theo `templates/review-log.md`) là bản ghi lưu vết; có thể chỉ đăng lên PR bằng comment và không commit vào nhánh, vì commit thêm sẽ đổi head SHA và làm mất duyệt.

## Điều kiện auto-merge (tóm tắt, logic thật ở `.github/scripts/auto-merge.js`)

- Duyệt trên đúng commit hiện tại: status `ai-review` = success, hoặc 1 review APPROVED của người khác tác giả trên head SHA.
- Không còn "Changes requested"; status `ai-review` không ở `failure`.
- Có ít nhất 1 check và tất cả xanh (CI `gate`, quét secret). Không có check nào thì KHÔNG merge.
- `mergeable_state` = `clean` (không `behind`, `dirty`, `blocked`). PR tụt sau `dev` thì author rebase, chạy lại cổng, push, và review lại ở chế độ nhẹ (chỉ mục "Tích hợp").
- Không phải draft, không có nhãn `do-not-merge` / `needs-human`, không phải PR từ fork.
- Mỗi lượt chỉ merge 1 PR; các PR còn lại tới lượt sau.

## Ghi sổ sau merge

Author (nếu còn sống) hoặc phiên đầu tiên sau đó chuyển `MVP-BACKLOG.md` sang Done (kèm số PR, xóa Owner) và thêm dòng rollup ở `AGENTS.md` gốc, qua một PR docs nhỏ chỉ chạm các file đó. Reviewer duyệt nhanh theo mức "chỉ docs". Đầu mỗi phiên, agent đối chiếu các dòng "Review" trong backlog với PR thật (`gh pr list --state merged`) và ghi sổ phần còn thiếu.

## Khi nào mới gọi user

- Chọn cơ chế dọc/ngang lần đầu (AGENTS.md mục 3) và các quyết định nghiệp vụ chưa có trong tài liệu.
- Release `dev` → `main` và hotfix vào `main` (hành động ra ngoài, khó đảo ngược).
- PR bị gắn `needs-human`: hết 3 round chưa thống nhất, hoặc reviewer không đủ tự tin ở phần rủi ro cao.
- Thay đổi chạm secret thật, hạ tầng/chi phí, hoặc xóa dữ liệu nghiệp vụ.
- CI/auto-merge hỏng vì cấu hình repo (quyền, branch protection) mà agent không sửa được.

## Cài đặt repo một lần

- Default branch = `dev` (workflow chạy theo event `pull_request_review`, `status`, `check_suite` dùng file ở nhánh mặc định).
- Bật "Automatically delete head branches".
- Branch protection trên `dev`: bắt buộc status check `gate`, `secrets`, `ai-review`; không bắt buộc review của người (trừ khi AI có tài khoản riêng); không cho push thẳng.
- Nhãn `needs-human`, `do-not-merge` tồn tại trong repo.
