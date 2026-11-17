# So sánh MausBot và Hermes Agent: skill, tính năng, ưu điểm vượt trội

Ngày tra cứu: 2026-11-17. Nguồn là tài liệu và README chính thức của hai dự án (liệt kê cuối file). Ô ghi **"không nêu"** nghĩa là tài liệu không nói tới, **không** có nghĩa là sản phẩm không có tính năng đó.

## 1. Tóm tắt một dòng

- **MausBot (OpenMausBot):** ứng dụng desktop biến các agent CLI (Claude, Codex, Grok…) thành một nhóm "bot" như nhóm chat, mỗi bot một vai trò, có máy ảo để thao tác. Hợp với người muốn giao việc cho nhiều bot ngay trên máy, bằng gói thuê bao đã có.
- **Hermes Agent (Nous Research):** agent chạy nền (máy, VPS hoặc cloud) có vòng học tự cải thiện: tự viết skill từ kinh nghiệm, nhớ người dùng qua các phiên, nhắn qua 20+ kênh chat. Hợp với người muốn một trợ lý chạy lâu dài, lên lịch và nói chuyện qua Telegram, Zalo, Slack…

| Tiêu chí | MausBot | Hermes Agent |
|---|---|---|
| Bản chất | App desktop quản lý nhiều bot, mỗi bot chạy qua một agent CLI | Agent chạy nền, có vòng học và bộ nhớ dài hạn |
| Giấy phép | Apache 2.0 (riêng thư mục `enterprise/` là source-available) | MIT |
| Độ phổ biến (GitHub, lúc tra cứu) | ~24.200 sao, repo tạo 08/2026 | ~263.900 sao, repo tạo 07/2025 |
| Cài đặt | Tải app macOS, Windows, Ubuntu (Ubuntu là beta); hoặc `npx openmausbot` (Node 24+) | Trình cài desktop, hoặc `curl … install.sh \| bash` trên Linux/macOS |
| Giá | Miễn phí; MausBot Cloud từ $15/tháng; phí model tính trên tài khoản của bạn | Miễn phí (MIT); phí model/provider tùy chọn |
| Dữ liệu nằm ở | `~/.openmausbot` trên máy bạn (hoặc My Cloud nếu dùng bản Cloud) | `~/.hermes/` (máy hoặc VPS bạn chạy) |

## 2. Skill

| Khía cạnh | MausBot | Hermes Agent | Nhỉnh hơn |
|---|---|---|---|
| Định dạng skill | Không nêu | `SKILL.md` + YAML frontmatter, theo chuẩn mở agentskills.io; kèm `references/`, `templates/`, `scripts/`, `assets/` | Hermes |
| Phạm vi | Skill thuộc **từng bot**, dùng chung giữa các thread của bot đó; tài liệu không nói cách chia skill giữa các bot | Thư mục chung `~/.hermes/skills/`, thêm được thư mục ngoài hoặc theo dự án (`.hermes/skills/`, `.agents/skills/`) | Hermes |
| Skill có sẵn | Có skill Phone Harness (điều khiển Android qua USB); có thư mục `skills/` trong repo; không có danh mục tổng | **44 skill bundled, 12 danh mục** (xem bên dưới) + catalog optional | Hermes |
| Văn phòng / PDF | Không nêu skill sẵn (làm được qua engine nền nếu tự viết skill) | `microsoft-office` (Word, Excel, PowerPoint), `pdf`, `google-workspace` | Hermes |
| Media | Không nêu skill sẵn | `manim-video`, `ascii-video`, `p5js`, `youtube-content`; ComfyUI không nằm trong 44 skill bundled | Hermes |
| Tự tạo và cải thiện skill | Không nêu. (Có đề xuất "Teach Me" trên GitHub, issue #324, chưa phải tính năng) | Có: `skill_manage` tạo/sửa/xóa, `/learn` thu thập tài liệu thành skill, tự cải thiện khi dùng | Hermes |
| Nạp skill tiết kiệm token | Không nêu | Progressive disclosure: chỉ nạp tên và mô tả, cần mới nạp nội dung | Hermes |
| Nguồn cài | Chia sẻ qua gói bot/"phòng ban" và nhập team | Hub: skills.sh, GitHub và tap, ClawHub, LobeHub, browse.sh, URL trực tiếp; có lệnh tìm, cài, cập nhật, gỡ, kiểm toán | Hermes |
| An toàn skill | Skill phải được duyệt (approved skills) theo từng bot | Quét skill cài từ Hub (đánh cắp dữ liệu, prompt injection, lệnh phá hoại, chuỗi cung ứng); mức tin cậy theo nguồn; `skills.write_approval` bắt duyệt mọi thay đổi của agent; khóa từng skill | Hermes |

**Một số skill bundled của Hermes theo danh mục:** `productivity` (microsoft-office, pdf, google-workspace, meeting-action-items), `software-development` (github, test-driven-development, systematic-debugging), `research` (arxiv, grounded-citations, competitor-news-monitor), `email` (email-inbox-triage, himalaya), `creative`, `media`, `apple`, `devops`, `note-taking`, `social-media`, `web`, `autonomous-ai-agents` (claude-code, codex, computer-use).

**Kết luận phần skill:** Hermes vượt rõ rệt ở hệ thống skill (chuẩn mở, hub, tự học, kiểm soát an toàn). Skill của MausBot hiện là phần ít được tài liệu hóa nhất của họ.

## 3. Tính năng

| Tính năng | MausBot | Hermes Agent | Nhỉnh hơn |
|---|---|---|---|
| Giao diện chính | Ứng dụng chat desktop; companion iOS (chat, approvals, xem máy tính) | CLI, TUI, ứng dụng desktop; tích hợp IDE (VS Code, Zed, JetBrains qua ACP) | Tùy nhu cầu |
| Nhiều agent | Mỗi bot có vai trò, model, tính cách, thư mục riêng; tối đa 3 thread chạy trực tiếp mỗi bot; Rooms cho nhiều agent, bot ủy quyền cho bot | `delegate_task` tạo subagent cô lập (mặc định 3 chạy song song) | MausBot (trải nghiệm đội bot) |
| Bộ nhớ | Văn bản thuần mỗi bot, **xem, sửa, xóa được**; bảo bot "quên" là xóa | `MEMORY.md` + `USER.md` có giới hạn ký tự, agent tự quản lý; tìm lại xuyên phiên bằng FTS5 + tóm tắt LLM; plugin: Honcho, Mem0, Supermemory, Hindsight… | Hermes (chiều sâu), MausBot (minh bạch) |
| MCP | Có: MCP server qua stdio cho Claude Desktop/Cursor; thêm MCP tool server riêng không cần code | Có: stdio hoặc HTTP, lọc tool theo server, sampling | Hòa |
| Ứng dụng ngoài | Composio: Gmail, Calendar, Slack, GitHub, Notion và "hàng trăm" app; nhiều tài khoản có nhãn mỗi app | Qua MCP và tool; Google Workspace, email, GitHub… qua skill | MausBot (tích hợp một lần đăng nhập) |
| Kênh nhắn tin ngoài | Tài liệu không nêu kênh cụ thể | **20+ kênh:** Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, Email, SMS, Microsoft Teams, Google Chat, DingTalk, Feishu, WeCom… | Hermes |
| Lên lịch, tự động hóa | Routine chạy một lần hoặc theo ngày trong tuần; task từ webhook; run receipt lưu lại. Trên máy cá nhân chỉ chạy khi app đang mở; bản Cloud chạy khi máy tắt | Cron bằng ngôn ngữ tự nhiên hoặc biểu thức cron, gắn skill, gửi kết quả tới kênh bất kỳ, pause/resume/edit; event hooks; batch hàng nghìn prompt | Hermes |
| Điều khiển máy tính | Mạnh: máy local (opt-in, có phê duyệt), Local VM (Docker/Podman), cloud desktop (Hosted Boat), VPS qua Docker SSH, xem trực tiếp và tiếp quản. Ubuntu hiện bị giữ ở chế độ chặn host control | Skill `computer-use`; không nêu máy ảo desktop tích hợp | MausBot |
| Trình duyệt | Không nêu riêng | Browserbase, Browser Use, Chrome/Brave/Edge qua CDP: điều hướng, điền form, trích xuất | Hermes |
| Thực thi mã | Qua agent CLI nền (Claude Code, Codex…) | Terminal 6 backend: local, Docker, SSH, Daytona, Modal, Vercel Sandbox (Daytona/Modal "ngủ" khi không dùng); `execute_code` gọi tool bằng Python | Hermes |
| Media | Không nêu tạo ảnh/video sẵn | Tạo ảnh qua FAL.ai (11 model: FLUX 2, GPT-Image, Ideogram V3, Recraft V4…), vision, Manim | Hermes |
| Giọng nói | Phản hồi bằng giọng (ElevenLabs, Fish Audio, giọng Mac, Chatterbox); dictation và gọi half-duplex | Voice mode, wake word "Hey Hermes", TTS 10 provider (Edge miễn phí, ElevenLabs, OpenAI, Piper…) | Hermes (nhiều lựa chọn) |
| Phê duyệt, an toàn | Approval cho lệnh shell, sửa file; ranh giới opt-in khi điều khiển máy | Checkpoint tự chụp thư mục trước khi sửa, `/rollback`; plugin guardrails. Tài liệu không mô tả luồng phê duyệt chi tiết | MausBot (approval rõ), Hermes (rollback) |
| Chi phí hiển thị | Token và chi phí theo từng task | Không nêu | MausBot |
| Model / engine | Qua agent CLI đã đăng nhập: Claude, Codex, Grok, Cursor, model local; CLI tùy chỉnh, ACP, endpoint tương thích OpenAI | Nous Portal, OpenRouter, OpenAI hoặc bất kỳ endpoint nào; provider routing, fallback, xoay vòng nhiều API key, prompt caching 1 giờ | Hermes (linh hoạt), MausBot (dùng thẳng thuê bao) |
| Mở rộng | Plugin không nêu; MCP server tùy chỉnh | Hệ plugin: tool, hook, memory provider, context engine, backend; API server tương thích OpenAI (Open WebUI, LobeChat…) | Hermes |
| Nền tảng | macOS, Windows, Ubuntu 24.04 (beta); installer Windows chưa ký | Linux, macOS, Windows, Android (aarch64) | Hermes |

## 4. Ưu điểm vượt trội của từng bên

### MausBot hơn Hermes ở

1. **Dùng thẳng gói thuê bao sẵn có** (Claude, ChatGPT, Grok): đăng nhập vào CLI là chạy, không phải cấp API key.
2. **Trải nghiệm "đội bot":** mỗi bot một vai trò, nhiều thread, Rooms, ủy quyền giữa các bot, xem token và chi phí từng task.
3. **Máy ảo và điều khiển máy tính hoàn chỉnh:** Local VM, cloud desktop, VPS, xem và tiếp quản trực tiếp.
4. **Bộ nhớ minh bạch:** văn bản thuần, mở ra xem, sửa, xóa được ngay.
5. **Tích hợp app một lần đăng nhập** qua Composio, nhiều tài khoản mỗi app.
6. **Có app iOS** để duyệt approval và theo dõi từ xa.

### Hermes hơn MausBot ở

1. **Vòng học tự cải thiện:** tự viết và sửa skill từ kinh nghiệm, nhớ người dùng qua các phiên.
2. **Hệ sinh thái skill mở:** chuẩn agentskills.io, hub nhiều nguồn, 44 skill sẵn, quét an toàn.
3. **20+ kênh nhắn tin** và cron ngôn ngữ tự nhiên gửi kết quả tới bất kỳ kênh: hợp làm trợ lý chạy nền, chăm sóc khách.
4. **Hạ tầng linh hoạt:** 6 terminal backend, chạy trên VPS hoặc serverless, API server tương thích OpenAI, tích hợp IDE.
5. **Nhiều lựa chọn model và dự phòng:** routing, fallback, xoay API key, prompt caching.
6. **Có sẵn công cụ media và văn phòng:** microsoft-office, pdf, Manim, tạo ảnh qua FAL.ai.

## 5. Chọn cái nào

| Nhu cầu | Nên chọn |
|---|---|
| Giao việc cho nhiều bot trên máy cá nhân bằng gói thuê bao sẵn có, cần máy ảo | **MausBot** |
| Trợ lý chạy nền 24/7 trên VPS, nhắn qua Telegram/Zalo/Slack, lên lịch | **Hermes Agent** |
| Cần tự động hóa văn phòng (Word, Excel, PowerPoint, PDF) có sẵn skill | **Hermes Agent** |
| Cần điều khiển desktop, thao tác giao diện trong máy ảo | **MausBot** |
| Muốn agent tự học quy trình lặp lại và tái dùng | **Hermes Agent** |
| Cần xem, sửa trực tiếp bộ nhớ của agent | **MausBot** |
| Muốn dùng cả hai | MausBot trên máy cho việc văn phòng và thao tác, Hermes trên VPS cho kênh chat và việc định kỳ. Hai bên không loại trừ nhau |

## 6. Lưu ý về độ tin cậy

- Hai dự án thay đổi nhanh. MausBot tạo từ 08/2026; tài liệu của họ ghi "mô tả hành vi đã phát hành, đề xuất nằm trên GitHub". Số liệu trong file này đúng ở ngày tra cứu, nên kiểm tra lại trước khi quyết định.
- Số sao GitHub chỉ phản ánh mức quan tâm, không phản ánh chất lượng.
- Các so sánh "nhỉnh hơn" dựa trên những gì tài liệu nêu. Nơi tài liệu im lặng, kết luận có thể thay đổi nếu sản phẩm thật có tính năng chưa được viết ra.
- Chưa cài và chạy thử thực tế cả hai, nên không có đánh giá về độ ổn định hay tốc độ.

## Nguồn

- MausBot: https://mausbot.com/ , https://docs.openmausbot.com/docs , https://docs.openmausbot.com/docs/features , https://docs.openmausbot.com/docs/features/bots-and-tasks , https://mausbot.com/guides/open-source-personal-ai-agent , https://github.com/milind-soni/OpenMausBot
- Hermes Agent: https://hermes-agent.nousresearch.com/docs , https://hermes-agent.nousresearch.com/docs/user-guide/features/overview , https://hermes-agent.nousresearch.com/docs/user-guide/features/skills , https://hermes-agent.nousresearch.com/docs/reference/skills-catalog , https://github.com/nousresearch/hermes-agent
