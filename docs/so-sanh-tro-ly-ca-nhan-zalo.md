# So sánh công cụ trợ lý cá nhân & tích hợp Zalo

Ghi lại nội dung đã trao đổi ngày 2026-11-13, phục vụ việc chọn công cụ cho vai trò trợ lý cá nhân: xử lý văn phòng (Word/Excel/PowerPoint, báo giá theo mẫu), việc media (sửa/ghép ảnh, dựng video, motion), và chăm sóc khách hàng qua Zalo.

## 1. MausBot (OpenMausBot) và Hermes Agent

| Tiêu chí | MausBot (OpenMausBot) | Hermes Agent (Nous Research) |
|---|---|---|
| Bản chất | App desktop điều khiển các agent CLI có sẵn (Claude Code, Codex, Grok, Cursor…), mỗi bot một vai trò | Agent chạy nền trên máy hoặc VPS, có bộ nhớ dài hạn, tự viết skill |
| Hạn chế dùng API | Mạnh nhất: đăng nhập thẳng bằng gói thuê bao của từng CLI | Đăng nhập thuê bao qua Nous Portal; nhận mọi endpoint tương thích OpenAI |
| Skill | Có, chia sẻ theo gói "phòng ban" | Có sẵn skill Word, Excel, PowerPoint, PDF |
| MCP | Thêm được MCP server tùy ý; app ngoài qua Composio | MCP qua stdio/HTTP, lọc tool theo server |
| Văn phòng, báo giá | Làm được qua engine nền, cần tự viết skill | Sẵn skill, chỉ cần thêm skill báo giá |
| Media | Có máy ảo/desktop để thao tác; tài liệu không nêu sẵn tạo ảnh, video | Skill Manim sẵn, ComfyUI tùy chọn; tạo ảnh mặc định qua FAL (cần API) |
| Zalo | Không nhắc tới; phải tự nối bằng MCP hoặc webhook | Có plugin Zalo Bot chính thức trong marketplace và plugin Zalo cá nhân (không chính thức) |

**Báo giá theo mẫu:** nên dùng một skill gồm file Excel/Word mẫu và script tính số lượng × đơn giá, thuế, chiết khấu — để script tính thay vì để model tự nhẩm, số liệu sẽ ổn định hơn.

**Media:** sửa/ghép hình, cắt dựng video, motion bằng code (ffmpeg, ImageMagick, Manim, Remotion) không cần API. Tạo ảnh/video bằng AI gần như bắt buộc có API, hoặc máy có GPU chạy ComfyUI.

**9router (decolua/9router — proxy OpenAI-compatible gom nhiều gói thuê bao):**
- Hợp với Hermes: là endpoint tương thích OpenAI chạy cục bộ, gom các gói thuê bao (Claude Code, Codex, Copilot…), tự chuyển khi hết hạn mức.
- Ít cần với MausBot: MausBot đã dùng thuê bao trực tiếp; endpoint tùy chỉnh chỉ gắn được qua engine OpenCode, Chat hoặc Claude Code, Codex chưa hỗ trợ.
- Rủi ro: vùng xám về điều khoản dịch vụ, tác giả xác nhận đã có người dùng bị khóa tài khoản Antigravity.

**Các "cửa" Zalo chính thức:**
- Zalo Bot Platform: miễn phí, tối đa 3 bot, mỗi bot tối đa 50 người dùng (gói Pro ~129.000đ/tháng, đang ra mắt).
- Zalo OA + Open API: ~2,5–6 triệu đồng/năm, hợp khi nhiều khách.
- Zalo cá nhân qua thư viện như zca-js: không chính thức, có thể bị khóa tài khoản.

*(Số liệu giá Zalo lấy từ một bài hướng dẫn tháng 10/2026, nên kiểm tra lại với Zalo trước khi đăng ký.)*

**Đề xuất:** chạy Hermes trên VPS nối Zalo Bot/OA để chăm sóc khách, dùng MausBot trên máy cho việc văn phòng và media. MausBot có thể gọi Hermes như một engine, nên quản lý được cả hai trong một giao diện.

## 2. Hai plugin tích hợp Zalo cho Hermes Agent

So sánh `luonghaianh1208/2anh-zalo-bot` và `moken627-hub/hermes-plugin-zalo`.

| Tiêu chí | 2Anh Zalo Bot | hermes-plugin-zalo (moken) |
|---|---|---|
| Kết nối Zalo | Tài khoản cá nhân, quét QR, qua thư viện không chính thức `zca-js` | Zalo Bot Platform chính thức, dùng bot token |
| Rủi ro tài khoản | Có thể bị khóa; tác giả khuyên dùng tài khoản phụ | Không vi phạm điều khoản Zalo |
| Khách nhìn thấy | Một tài khoản Zalo bình thường | Một bot (tên bắt đầu bằng "Bot …") |
| Gửi file (báo giá, Word, Excel) | Có | Chưa; gửi file còn trong roadmap, hiện chỉ chữ và ảnh qua URL |
| Tính năng CSKH | Dashboard phân quyền, danh bạ, lịch sử SQLite, gửi hàng loạt có cá nhân hóa tên, hẹn giờ, giới hạn theo ngày | Lịch sử chat, danh bạ CRM, quản lý nhóm, chống spam, bình chọn |
| Cài đặt | Nặng hơn: Node.js 22+, một tiến trình chạy kèm Hermes | Nhẹ: chép vào thư mục plugin của Hermes, không thêm thư viện |
| Quy mô mã | ~470 file, bản 2.66.1, cập nhật 03/11/2026 | 17 file, ~3.500 dòng, cập nhật 12/10/2026 |
| Mức tin cậy | 45 sao, 31 fork, có bộ test riêng | 11 sao, nằm trong marketplace chính thức của Hermes |

**Khuyến nghị:**
- Chọn **2Anh** nếu cần bot gửi file báo giá và chăm sóc khách ngay trong Zalo. Nên chạy trên số Zalo phụ, không dùng số chính của doanh nghiệp; dùng tính năng gửi hàng loạt dè dặt vì dễ gây khóa tài khoản.
- Chọn **plugin của moken** nếu ưu tiên an toàn lâu dài và chỉ cần tư vấn bằng chữ.
- Có thể chạy song song: plugin chính thức làm kênh tư vấn công khai, 2Anh trên số phụ lo việc gửi file và chăm sóc khách quen.

## Nguồn tham khảo
- https://mausbot.com/ , https://docs.openmausbot.com/docs , https://github.com/milind-soni/OpenMausBot
- https://hermes-agent.nousresearch.com/docs/user-guide/features/overview , https://hermes-agent.nousresearch.com/docs/reference/skills-catalog
- https://hermes-agent.nousresearch.com/marketplace/zalo-platform
- https://github.com/decolua/9router
- https://aduca.vn/tai-lieu/hermes-agent-zalo/
- https://github.com/luonghaianh1208/2anh-zalo-bot
- https://github.com/moken627-hub/hermes-plugin-zalo
