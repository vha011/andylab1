# Quy trình AI Workflow

Mô tả cơ chế để nhiều dev/agent làm việc song song trên nhiều Slice/Task mà không đụng file nhau, và cách tích hợp (merge) an toàn có ngữ cảnh.

## Thứ tự đọc khi bắt đầu phiên

1. `../../AGENTS.md` ở gốc repo.
2. `../methodology/README.md` — xác nhận cơ chế triển khai (Dọc/Ngang) đang dùng.
3. `../tasks/MVP-BACKLOG.md` — chọn hoặc xác nhận Slice/Task đang phụ trách, kiểm tra cột Phụ thuộc.
4. `../tasks/slices/<id>.md` — chi tiết Slice/Task đang làm.
5. `AGENTS.md` của thư mục feature đang sửa — nhật ký gần nhất, xem người trước dừng ở đâu.
6. `../tasks/CURRENT.md` — CHỈ đọc nếu chắc chắn đang làm một mình tuần tự.

## Vòng đời một Slice/Task

1. Thêm dòng vào `MVP-BACKLOG.md` với ID bất biến, trạng thái "Chưa bắt đầu".
2. Tạo file chi tiết từ `../tasks/slices/_TEMPLATE.md`.
3. Khi nhận việc: đổi trạng thái "Đang làm", ghi Owner, tạo nhánh riêng từ `dev`.
4. Trong lúc làm: cập nhật `AGENTS.md` của feature liên tục (tối thiểu mỗi ngày làm việc) theo mẫu `../templates/feature-AGENTS.template.md`, và cập nhật file chi tiết slice khi có thay đổi phạm vi.
5. Trước khi mở PR: chạy cổng gác, rebase/merge `dev` mới nhất, đọc lại `MVP-BACKLOG.md` để biết Slice/Task nào khác đã merge có thể ảnh hưởng tới file dùng chung.
6. Mở PR, base = `dev`, điền PR template (`../../.github/pull_request_template.md`), đổi trạng thái Slice/Task = "Review" trong `MVP-BACKLOG.md`.
7. Khởi chạy phiên AI reviewer độc lập (prompt 23.8 ở `../../AGENTS.md`) và theo dõi PR tới khi merge. Giao thức: `ai-review.md`. Changes requested → sửa trên cùng nhánh → review lại (tối đa 3 round).
8. Review pass + CI xanh → tự động merge → tự động xóa nhánh. Không cần user duyệt.
9. Sau merge: ghi sổ — trạng thái = "Done" (kèm số PR) trong `MVP-BACKLOG.md`, cập nhật rollup ở `../../AGENTS.md` (xem "Ghi sổ sau merge" trong `ai-review.md`).

## Làm việc song song nhiều dev trên nhiều feature

- Mỗi Slice/Task có đúng 1 Owner tại một thời điểm (cột Owner trong `MVP-BACKLOG.md`) — không nhận việc đã có Owner.
- Mỗi Owner làm trong một worktree + một nhánh riêng (xem `../../AGENTS.md`, mục "Làm việc song song nhiều dev / nhiều feature").
- Không bắt đầu Slice/Task có cột "Phụ thuộc" chưa Done, trừ khi phụ thuộc đó đã ở "Đang làm" và hai bên thống nhất merge tuần tự.
- File dùng chung (điểm ghép router/app.ts, openapi.yaml, package.json...) sửa theo kiểu "mỗi dòng độc lập" hoặc append-only để giảm conflict; nếu bắt buộc sửa cùng vùng, phải làm tuần tự và ghi chú trong `MVP-BACKLOG.md`.

## Quy trình tích hợp (merge) có ngữ cảnh

Trước khi merge một Slice/Task vào `dev`, người/agent thực hiện merge phải:

1. Kéo `dev` mới nhất về nhánh của Slice/Task, giải quyết conflict.
2. Đọc `MVP-BACKLOG.md` để liệt kê Slice/Task khác đã merge vào `dev` từ lúc nhánh này được tạo.
3. Với mỗi Slice/Task đó, đọc nhanh `AGENTS.md` của feature liên quan (mục "Đã xong" gần nhất) để biết có đổi contract, schema, hoặc điểm ghép dùng chung hay không.
4. Nếu có đổi ảnh hưởng: cập nhật code đang merge cho khớp, không ghi đè thay đổi của Slice/Task kia.
5. Chạy lại toàn bộ cổng gác sau khi rebase.
6. Mô tả PR ghi rõ: Slice/Task ID, cơ chế (Dọc/Ngang), các Slice/Task khác có giao nhau về file, đã rebase với `dev` tại commit nào.
7. Reviewer AI độc lập xác nhận theo checklist trong `ai-review.md`: không drift OpenAPI, migration additive, `AGENTS.md` của feature đã cập nhật, `MVP-BACKLOG.md` đã cập nhật.

## Review bằng AI và auto-merge

Review do một phiên AI khác author thực hiện, không cần user. Toàn bộ giao thức (nguyên tắc độc lập, vòng lặp, checklist, cách đặt kết quả, khi nào gọi user, cài đặt repo): `ai-review.md`.

Điều kiện auto-merge (PR vào `dev`), kiểm bằng `../../.github/scripts/auto-merge.js`:

- Status `ai-review` = success trên đúng commit hiện tại, do reviewer độc lập (khác author) đặt.
- Có ít nhất 1 check và toàn bộ check xanh (cổng gác `gate`, quét secret). Không có check nào thì không merge.
- Không còn "Changes requested"; PR chứa đủ commit mới nhất của `dev`.

Đủ điều kiện: tự động squash merge vào `dev` và xóa nhánh nguồn. "Changes requested": KHÔNG merge; sửa tiếp trên cùng nhánh, review lại. Cấu hình mẫu: `../../.github/workflows/auto-merge.yml`.

## Quy tắc bàn giao giữa phiên (hết token, hết quota, mất điện, máy treo)

- Bất cứ khi nào sắp dừng, trạng thái phải luôn được ghi vào 2 nơi: `AGENTS.md` của feature (nhật ký liên tục) và file chi tiết Slice/Task (mục "Bàn giao phiên gần nhất").
- Dùng mẫu `templates/session-handoff.md` cho cả hai nơi trên để đồng nhất định dạng.
- Nếu bị ngắt đột ngột (mất điện, máy treo, hết quota giữa chừng) và phiên trước KHÔNG kịp ghi bàn giao: phiên sau phải tự suy luận trạng thái từ `git log` trên nhánh, `git diff dev...HEAD`, cổng gác hiện tại (pass/fail), rồi mới cập nhật lại bàn giao cho đúng trước khi tiếp tục.
- Không bao giờ giả định "chắc là đã xong" khi không có ghi chú rõ ràng — luôn chạy lại cổng gác trước khi tiếp tục hoặc mở PR.
- Chỉ dùng `../tasks/CURRENT.md` làm nơi bàn giao khi chắc chắn đang làm tuần tự một mình.

## Chiến lược nhánh

Xem `../../AGENTS.md`, mục "Mô hình nhánh, release và hotfix". Tóm tắt: mọi Slice/Task làm trên nhánh riêng, PR base = `dev`; `main` chỉ nhận code lúc release hoặc hotfix; agent không tự merge vào `main`.
