"""Sinh slide khoá học 'AI làm video nội bộ cho HR'. Chạy: python build_slides.py
Đổi màu thương hiệu ở khối BRAND bên dưới rồi chạy lại."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

BRAND = dict(primary="1F4FD8", accent="FF8A00", dark="0F172A", light="F5F7FB", text="1E293B", muted="64748B")
FONT = "Be Vietnam Pro"  # đổi thành font công ty; máy không có sẽ tự thay bằng Arial
C = {k: RGBColor.from_string(v) for k, v in BRAND.items()}
WHITE = RGBColor(255, 255, 255)

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
blank = prs.slide_layouts[6]
count = [0]

def rect(s, x, y, w, h, color, shape=MSO_SHAPE.RECTANGLE):
    r = s.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    r.fill.solid(); r.fill.fore_color.rgb = color; r.line.fill.background()
    return r

def text(s, x, y, w, h, t, size=20, color=None, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    lines = t if isinstance(t, list) else [t]
    for i, l in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align; p.space_after = Pt(8)
        r = p.add_run(); r.text = l
        r.font.size = Pt(size); r.font.bold = bold; r.font.name = FONT
        r.font.color.rgb = color or C["text"]
    return tb

def base(title, notes, dark=False):
    s = prs.slides.add_slide(blank); count[0] += 1
    rect(s, 0, 0, 13.333, 7.5, C["dark"] if dark else WHITE)
    if not dark:
        rect(s, 0, 0, 0.25, 7.5, C["primary"])
        text(s, 0.7, 0.4, 11.9, 1.0, title, 30, C["dark"], True, anchor=MSO_ANCHOR.MIDDLE)
        rect(s, 0.75, 1.4, 1.2, 0.07, C["accent"])
        text(s, 12.2, 7.0, 0.9, 0.4, str(count[0]), 12, C["muted"], align=PP_ALIGN.RIGHT)
    if notes:
        s.notes_slide.notes_text_frame.text = notes
    return s

def title_slide(title, sub, notes=""):
    s = base("", notes, dark=True)
    rect(s, 0.8, 2.4, 1.6, 0.1, C["accent"])
    text(s, 0.8, 2.6, 11.5, 1.8, title, 44, WHITE, True)
    text(s, 0.8, 4.5, 11.5, 1.5, sub, 22, RGBColor(203, 213, 225))

def section(num, title, sub, notes=""):
    s = base("", notes, dark=True)
    text(s, 0.8, 2.2, 3, 1.5, num, 80, C["accent"], True)
    text(s, 0.8, 3.8, 11.5, 1.2, title, 40, WHITE, True)
    text(s, 0.8, 5.0, 11.5, 1.2, sub, 20, RGBColor(203, 213, 225))

def bullets(title, items, notes="", size=24):
    s = base(title, notes)
    text(s, 0.9, 1.8, 11.6, 5.0, ["•  " + i for i in items], size)

def cards(title, items, notes="", cols=None):
    s = base(title, notes)
    n = len(items); cols = cols or (n if n <= 3 else 2 if n == 4 else 3)
    rows = -(-n // cols); gap = 0.3
    w = (11.9 - gap * (cols - 1)) / cols; h = (5.1 - gap * (rows - 1)) / rows
    for i, (head, body) in enumerate(items):
        x = 0.8 + (i % cols) * (w + gap); y = 1.8 + (i // cols) * (h + gap)
        rect(s, x, y, w, h, C["light"], MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.05
        rect(s, x, y + 0.2, 0.09, 0.6, C["accent"])
        text(s, x + 0.3, y + 0.15, w - 0.5, 0.8, head, 21, C["primary"], True)
        text(s, x + 0.3, y + 0.95, w - 0.5, h - 1.0, body, 17)

def flow(title, steps, notes=""):
    s = base(title, notes)
    n = len(steps); gap = 0.25; w = (11.9 - gap * (n - 1)) / n
    for i, (head, body) in enumerate(steps):
        x = 0.8 + i * (w + gap)
        c = rect(s, x, 2.2, w, 0.9, C["primary"], MSO_SHAPE.PENTAGON)
        text(s, x + 0.1, 2.2, w - 0.4, 0.9, f"{i+1}. {head}", 17, WHITE, True, anchor=MSO_ANCHOR.MIDDLE)
        text(s, x, 3.3, w, 3.4, body, 16)

def table(title, header, rows, notes="", widths=None):
    s = base(title, notes)
    nc = len(header); widths = widths or [11.9 / nc] * nc
    t = s.shapes.add_table(len(rows) + 1, nc, Inches(0.8), Inches(1.8), Inches(11.9), Inches(0.6 * (len(rows) + 1))).table
    for j, wd in enumerate(widths): t.columns[j].width = Inches(wd)
    for i, row in enumerate([header] + rows):
        for j, v in enumerate(row):
            cell = t.cell(i, j); cell.text = v
            cell.fill.solid(); cell.fill.fore_color.rgb = C["primary"] if i == 0 else (C["light"] if i % 2 else WHITE)
            for p in cell.text_frame.paragraphs:
                for r in p.runs:
                    r.font.size = Pt(16); r.font.name = FONT; r.font.bold = (i == 0)
                    r.font.color.rgb = WHITE if i == 0 else C["text"]

def lab(title, goal, tasks, notes=""):
    s = base("THỰC HÀNH: " + title, notes)
    rect(s, 0.8, 1.8, 11.9, 1.0, C["accent"], MSO_SHAPE.ROUNDED_RECTANGLE).adjustments[0] = 0.15
    text(s, 1.0, 1.8, 11.5, 1.0, "Mục tiêu: " + goal, 20, WHITE, True, anchor=MSO_ANCHOR.MIDDLE)
    text(s, 0.9, 3.1, 11.6, 3.8, [f"{i+1}.  {t}" for i, t in enumerate(tasks)], 20)

# ============ MỞ ĐẦU ============
title_slide("AI làm video nội bộ cho HR", "Giải thích quy trình & sản phẩm công ty bằng video chuẩn thương hiệu\nKhoá 3 buổi · Antigravity · Gemini · Remotion · HyperFrames · VieNeu-TTS",
 "Chào lớp, giới thiệu giảng viên. Hỏi nhanh: ai đã từng dùng ChatGPT/Gemini? ai đã làm video bằng CapCut/Canva?")
bullets("Vì sao HR nên biết làm video bằng AI?", [
 "Onboarding nhân viên mới: cùng một nội dung lặp lại hàng chục lần/năm",
 "Quy trình (nghỉ phép, chấm công, bảo hiểm, thanh toán…) thay đổi liên tục, video quay thật rất khó cập nhật",
 "Video 90 giây dễ nhớ hơn file PDF 20 trang",
 "AI giúp: viết kịch bản, dựng hình động, lồng tiếng Việt – sửa 1 dòng là xuất lại cả video",
 "Chi phí thấp, không cần studio, không cần biết lập trình sâu"], "Nhấn mạnh: mục tiêu không phải thay designer, mà để HR tự làm các video nội bộ nhanh.")
bullets("Kết thúc khoá học bạn sẽ làm được", [
 "Hiểu AI, model, prompt, skill, agent là gì – bằng ngôn ngữ đời thường",
 "Dùng Antigravity để ra lệnh cho AI làm việc trên máy bạn",
 "Tạo 'bộ nhận diện thương hiệu' để mọi video đúng màu, font, logo, giọng điệu công ty",
 "Dựng video giải thích bằng Remotion / HyperFrames từ kịch bản",
 "Tạo giọng đọc tiếng Việt tự nhiên bằng VieNeu-TTS",
 "Có quy trình chuẩn: Kịch bản → Duyệt → Dựng → Lồng tiếng → Xuất → Cập nhật"], "Sản phẩm cuối khoá: 1 video 60–120 giây về một quy trình thật của công ty.")
table("Lộ trình 3 buổi", ["Buổi", "Chủ đề", "Kết quả"], [
 ["1 (~2.5h)", "Nền tảng AI & công cụ: model, prompt, agent, skill, Antigravity", "Chạy được AI trong Antigravity, viết kịch bản bằng AI"],
 ["2 (~2.5h)", "Thương hiệu + dựng video: brand kit, Remotion, HyperFrames, edit kit", "Video không tiếng đúng style công ty"],
 ["3 (~2.5h)", "Giọng đọc Việt + hoàn thiện: VieNeu-TTS, ghép, quy trình, quản trị rủi ro", "Video hoàn chỉnh + quy trình vận hành"]],
 "Thời lượng linh hoạt: nếu lớp chưa quen máy tính, dành thêm thời gian ở buổi 1. Mỗi buổi gồm lý thuyết ~40%, thực hành ~60%.", [1.8, 6.2, 3.9])

# ============ BUỔI 1 ============
section("01", "Nền tảng AI & công cụ", "AI là gì · Model · Prompt · Agent · Skill · Antigravity", "Buổi 1. Tránh thuật ngữ; luôn dùng ví dụ HR.")
cards("AI là gì? (giải thích đời thường)", [
 ("AI", "Phần mềm có thể làm việc cần 'thông minh' của con người: đọc, viết, nhìn, nghe, nói."),
 ("AI tạo sinh (Generative AI)", "AI tạo ra nội dung mới: văn bản, hình ảnh, giọng nói, video, code."),
 ("Điều cần nhớ", "AI không 'biết' như người; nó dự đoán điều hợp lý nhất tiếp theo. Vì vậy có thể sai mà vẫn rất tự tin.")],
 "Ví dụ: AI giống một nhân viên mới rất đọc nhiều sách, làm nhanh, nhưng chưa biết quy định công ty và đôi khi bịa.")
cards("Model AI là gì?", [
 ("Model = 'bộ não'", "Chương trình đã được huấn luyện từ lượng dữ liệu khổng lồ. Ví dụ: Gemini (Google), GPT (OpenAI), Claude (Anthropic)."),
 ("Phiên bản & cấp độ", "Model mới thường giỏi hơn nhưng đắt/chậm hơn. Có bản 'nhanh-rẻ' và bản 'mạnh-suy luận sâu'."),
 ("Chọn model", "Việc đơn giản (viết lại câu) → model nhanh. Việc phức tạp (lập kế hoạch, viết code video) → model mạnh."),
 ("Giới hạn", "Kiến thức có mốc thời gian; không biết dữ liệu nội bộ nếu bạn không đưa vào.")],
 "Lưu ý cho giảng viên: kiểm tra tên/phiên bản model đang có trong Antigravity trước buổi học (ví dụ dòng Gemini 3.x) vì thay đổi nhanh.")
cards("Các loại model bạn sẽ gặp trong khoá này", [
 ("Model ngôn ngữ (LLM)", "Đọc & viết chữ, viết kịch bản, viết code. Ở đây: Gemini."),
 ("Model giọng nói (TTS)", "Biến chữ thành giọng đọc. Ở đây: VieNeu-TTS cho tiếng Việt."),
 ("Model hình ảnh / video", "Tạo ảnh/clip từ mô tả. Khoá này dùng cách khác: dựng bằng code để đúng thương hiệu 100%.")],
 "Giải thích vì sao chọn dựng bằng code (Remotion) thay vì video-gen: kiểm soát chữ, logo, màu, số liệu chính xác.")
bullets("Prompt – cách 'giao việc' cho AI", [
 "Prompt = yêu cầu bạn viết cho AI. Giao việc cho AI giống giao việc cho nhân viên mới",
 "Công thức 5 phần: VAI TRÒ – BỐI CẢNH – NHIỆM VỤ – ĐỊNH DẠNG ĐẦU RA – RÀNG BUỘC",
 "Ví dụ: 'Bạn là chuyên viên đào tạo. Công ty có quy trình xin nghỉ phép (đính kèm). Viết kịch bản video 90 giây, giọng thân thiện, 6 cảnh, mỗi cảnh <20 từ.'",
 "Prompt tốt = cụ thể + có ví dụ + nói rõ điều KHÔNG được làm",
 "Làm lại và tinh chỉnh nhiều vòng là bình thường"], "Cho học viên viết prompt xấu và prompt tốt, so sánh kết quả trực tiếp.")
cards("Context, token và 'trí nhớ' của AI", [
 ("Context (ngữ cảnh)", "Toàn bộ thông tin AI đang nhìn thấy: câu hỏi, file đính kèm, hội thoại trước đó."),
 ("Token", "Đơn vị đếm chữ của AI (~ 1 từ tiếng Việt có thể là 1–3 token). Giới hạn context và chi phí tính theo token."),
 ("Quên & lẫn", "Hội thoại quá dài AI dễ quên chi tiết. Mẹo: mở phiên mới cho việc mới, đưa tài liệu cốt lõi vào file."),
 ("Dữ liệu nhạy cảm", "Không dán lương, CCCD, hồ sơ cá nhân vào AI công cộng. Sẽ học kỹ ở buổi 3.")], "")
cards("Từ chatbot đến Agent", [
 ("Chatbot", "Bạn hỏi – nó trả lời bằng chữ. Bạn tự copy/dán và tự làm."),
 ("Agent (trợ lý tự hành)", "Bạn giao mục tiêu – nó tự lập kế hoạch, đọc/ghi file, chạy lệnh, kiểm tra, sửa lỗi, báo kết quả."),
 ("Vì sao quan trọng", "Làm video bằng code cần nhiều bước (tạo file, chạy, xem lỗi, sửa). Agent làm hết giúp bạn.")],
 "Ví dụ: chatbot = chuyên gia tư vấn qua điện thoại; agent = nhân viên ngồi cạnh bạn, tự thao tác trên máy.")
cards("Antigravity là gì?", [
 ("Môi trường làm việc với agent", "Ứng dụng của Google cho phép giao việc cho AI agent làm trực tiếp trên thư mục dự án của bạn (code, file, trình duyệt)."),
 ("Bạn là 'sếp'", "Bạn mô tả mục tiêu, xem kế hoạch, duyệt kết quả. Agent thao tác và báo cáo từng bước."),
 ("Trong khoá này", "Antigravity + Gemini là 'trung tâm điều khiển' để dùng mọi skill: Remotion, HyperFrames, edit kit, TTS.")],
 "Lưu ý: giao diện và tên các tính năng của Antigravity cập nhật thường xuyên, hãy mở bản đang dùng và chụp lại màn hình làm slide minh hoạ.")
flow("Một vòng làm việc trong Antigravity", [
 ("Mở dự án", "Chọn một thư mục trống = 'phòng làm việc' của video"),
 ("Giao mục tiêu", "Viết prompt: video gì, cho ai, bao lâu"),
 ("Xem kế hoạch", "Đọc plan agent đề xuất, chỉnh nếu sai"),
 ("Agent làm", "Tạo file, chạy lệnh, xem trước"),
 ("Duyệt & sửa", "Xem kết quả, yêu cầu chỉnh bằng lời")], "Nhấn mạnh: luôn đọc plan trước khi cho chạy; HR là người chịu trách nhiệm nội dung cuối.")
cards("Skill là gì?", [
 ("Định nghĩa", "Skill = 'sổ tay hướng dẫn' đóng gói cho AI: một thư mục chứa hướng dẫn (và đôi khi script, mẫu) dạy agent làm MỘT loại việc theo đúng cách."),
 ("Ví dụ so sánh", "Nhân viên mới + sổ tay 'Quy trình duyệt hợp đồng' → làm đúng chuẩn. Agent + skill 'Remotion' → dựng video đúng chuẩn."),
 ("Lợi ích", "Nhất quán, nhanh, không phải giải thích lại mỗi lần. Agent chỉ nạp skill khi cần nên đỡ tốn context."),
 ("Bạn cũng tạo được", "Skill 'Brand công ty' và skill 'Quy trình làm video HR' của riêng bạn – sẽ làm ở buổi 2.")],
 "Cấu trúc điển hình: thư mục skill có file SKILL.md (tên, mô tả khi nào dùng, các bước) + file phụ. Kiểm tra cách Antigravity nạp skill ở phiên bản đang dùng.")
cards("Skill vs Prompt vs MCP vs Agent – phân biệt nhanh", [
 ("Prompt", "Yêu cầu một lần. Nói xong là hết."),
 ("Skill", "Hướng dẫn tái sử dụng, dạy 'cách làm' một việc."),
 ("MCP / công cụ", "'Ổ cắm' cho AI kết nối phần mềm ngoài (Drive, Sheet, Slack…)."),
 ("Agent", "Người làm: dùng model + skill + công cụ để hoàn thành mục tiêu.")], "Ẩn dụ nhà bếp: Agent = đầu bếp, Skill = công thức, Công cụ = dụng cụ, Prompt = đơn gọi món.")
table("Bản đồ công cụ của khoá học", ["Công cụ", "Là gì", "Vai trò trong video"], [
 ["Antigravity + Gemini", "Môi trường agent + model ngôn ngữ", "Bộ não: viết kịch bản, viết code, điều phối"],
 ["Remotion", "Thư viện dựng video bằng code (React)", "Dựng hình động, chữ, logo, biểu đồ"],
 ["HyperFrames", "Dựng video từ HTML/CSS", "Lựa chọn dựng nhanh dạng 'trang web thành video'"],
 ["Edit kit (herk-edit-kit)", "Bộ skill/công cụ chỉnh sửa video", "Cắt, ghép, phụ đề, hoàn thiện"],
 ["VieNeu-TTS", "Model đọc tiếng Việt", "Giọng đọc tự nhiên"]],
 "Cảnh báo giảng viên: xác minh trước tên chính xác, cách cài và giấy phép của từng skill (đặc biệt edit kit) rồi cập nhật slide này.", [2.6, 4.3, 5.0])
lab("Làm quen Antigravity & viết kịch bản", "Mọi học viên có kịch bản video 60–90 giây về một quy trình HR thật",
 ["Mở Antigravity, tạo thư mục dự án 'video-hr-01'", "Chọn model, thử 1 prompt xấu và 1 prompt tốt (công thức 5 phần)", "Nhờ AI viết kịch bản 6 cảnh: lời đọc + mô tả hình + thời lượng", "Chỉnh giọng văn 2 lần ('thân thiện hơn', 'ngắn hơn')", "Lưu kịch bản vào file script.md"],
 "Gợi ý chủ đề: xin nghỉ phép, đăng ký công tác, quy trình nhận lương, ngày đầu đi làm. Chuẩn bị tài liệu mẫu để học viên đính kèm.")
bullets("Tổng kết buổi 1 & bài tập về nhà", [
 "Nhớ: Model = bộ não · Prompt = đơn giao việc · Agent = người làm · Skill = sổ tay",
 "Bài tập: chọn 1 quy trình thật của phòng ban, viết sơ đồ các bước (5–7 bước)",
 "Sưu tầm: logo, mã màu, font, 2–3 video/ảnh mẫu thể hiện phong cách công ty",
 "Cài sẵn phần mềm cho buổi 2 (Node.js, Remotion) theo hướng dẫn"], "Gửi trước checklist cài đặt để buổi 2 không mất thời gian.")

# ============ BUỔI 2 ============
section("02", "Thương hiệu & dựng video", "Brand kit · Remotion · HyperFrames · Edit kit", "Buổi 2: phần quan trọng nhất để video 'đúng chất công ty'.")
cards("Video đúng 'chất' công ty gồm những gì?", [
 ("Màu sắc", "Màu chính, màu nhấn, nền, màu chữ – ghi bằng mã HEX."),
 ("Chữ", "Font tiêu đề & nội dung, cỡ chữ, hỗ trợ tiếng Việt có dấu đầy đủ."),
 ("Logo & hình", "Logo, vị trí đặt, vùng an toàn, kiểu icon/hình minh hoạ."),
 ("Giọng điệu (tone)", "Thân thiện hay trang trọng? Xưng hô 'bạn' hay 'anh/chị'? Từ nên/không nên dùng."),
 ("Chuyển động", "Nhanh/chậm, kiểu chuyển cảnh, nhạc nền."),
 ("Cấu trúc video", "Mở đầu – các bước – kết (kêu gọi hành động), thời lượng chuẩn.")], "Cho học viên đối chiếu với brand guideline có sẵn của công ty. Nếu chưa có, dựng nhanh từ logo + website.")
cards("Brand kit: dạy AI nhớ thương hiệu", [
 ("Bước 1 – File brand.md", "Ghi toàn bộ màu, font, tone, quy tắc, ví dụ đúng/sai vào một file."),
 ("Bước 2 – Tài sản", "Thư mục assets/: logo, ảnh, icon, font."),
 ("Bước 3 – Đóng gói skill", "Biến thành skill 'brand-cong-ty' để agent luôn tự nạp khi làm video."),
 ("Kết quả", "Mọi video về sau tự đúng style, ai làm cũng giống nhau.")], "Mẹo: nhờ AI đọc website/slide công ty để trích xuất màu & phong cách, sau đó con người rà lại.")
bullets("Ví dụ nội dung file brand.md", [
 "Màu chính #1F4FD8 · màu nhấn #FF8A00 · nền #F5F7FB (thay bằng màu công ty bạn)",
 "Font tiêu đề: Be Vietnam Pro Bold · nội dung: Regular (đủ dấu tiếng Việt)",
 "Tone: thân thiện, ngắn gọn, xưng 'bạn', tránh thuật ngữ pháp lý nặng nề",
 "Logo góc trên-phải, cách mép 48px; không đặt trên nền sặc sỡ",
 "Mỗi cảnh ≤ 20 từ chữ trên màn hình; mỗi video có 1 hành động cuối (ví dụ 'Liên hệ HR qua …')"], "Đây là phần học viên sẽ tự viết trong bài thực hành.", 22)
lab("Tạo brand kit", "Có file brand.md + assets + skill thương hiệu chạy được trong Antigravity",
 ["Đưa logo, mã màu, font vào thư mục assets/", "Nhờ agent soạn brand.md từ tài liệu bạn đưa", "Rà lại: sửa màu/giọng điệu cho đúng thực tế", "Nhờ agent đóng gói thành skill thương hiệu", "Kiểm thử: yêu cầu 'tạo 1 slide tiêu đề đúng brand' và xem kết quả"], "")
cards("Remotion là gì?", [
 ("Định nghĩa", "Công cụ dựng video bằng code: mỗi video là một chương trình, mỗi khung hình được 'vẽ' bằng web (React)."),
 ("Khác CapCut/Premiere", "Không kéo-thả timeline. Bạn mô tả, code sinh ra hình động. Sửa chữ/số = xuất lại, không dựng lại."),
 ("Điểm mạnh với HR", "Một mẫu, nhiều video: đổi dữ liệu là có video mới (quy trình khác nhau, chi nhánh khác nhau). Đúng brand tuyệt đối."),
 ("Bạn cần biết code?", "Không. Agent + skill Remotion viết code; bạn chỉ mô tả và duyệt.")],
 "Lưu ý giấy phép: Remotion có điều kiện thương mại riêng cho doanh nghiệp quy mô nhất định; kiểm tra trang giấy phép chính thức trước khi dùng nội bộ công ty.")
flow("Cách một video Remotion được tạo ra", [
 ("Kịch bản", "script.md từ buổi 1"),
 ("Cảnh (Scene)", "Mỗi cảnh = 1 thành phần: chữ, icon, logo, biểu đồ"),
 ("Timeline", "Sắp thời lượng, chuyển cảnh, hiệu ứng"),
 ("Xem trước", "Preview ngay trên trình duyệt"),
 ("Xuất file", "Render ra MP4")], "Demo trực tiếp: giảng viên giao prompt, agent sinh dự án Remotion, mở preview.")
bullets("Prompt mẫu: dựng video từ kịch bản", [
 "'Dùng skill thương hiệu và skill Remotion. Đọc script.md.'",
 "'Dựng video 1920x1080, 30fps, mỗi cảnh một trang riêng, chuyển cảnh mượt, nền theo brand.'",
 "'Chữ trên màn hình tối đa 20 từ, cỡ chữ đọc được trên điện thoại.'",
 "'Chưa lồng tiếng. Chừa khoảng thời lượng theo số từ của lời đọc (~2.5 từ/giây).'",
 "'Mở preview cho tôi xem và liệt kê những gì bạn đã làm.'"], "Cho học viên thử chỉnh: 'đổi nền cảnh 3 sang màu nhấn', 'thêm icon lịch', 'chậm hơn 20%'.", 22)
cards("HyperFrames là gì? Khi nào dùng thay Remotion?", [
 ("Định nghĩa", "Dựng video từ HTML/CSS (như làm một trang web có hoạt hình rồi xuất thành video), phù hợp để agent tạo nhanh."),
 ("Dùng HyperFrames khi", "Muốn làm nhanh video ngắn, đồ hoạ kiểu 'trang web', hoặc đã có sẵn thiết kế HTML."),
 ("Dùng Remotion khi", "Cần video dài, nhiều cảnh, nhiều dữ liệu, tái sử dụng mẫu lớn, kiểm soát chi tiết."),
 ("Lời khuyên", "Bắt đầu bằng MỘT công cụ. Cùng brand kit dùng được cho cả hai.")],
 "Giảng viên cần kiểm tra lại tính năng/cách cài đặt chính thức của HyperFrames ở phiên bản đang dùng.")
cards("Edit kit: hoàn thiện video", [
 ("Làm gì?", "Bộ công cụ/skill hỗ trợ chỉnh sửa: cắt ghép clip, thêm phụ đề, căn âm thanh, chuẩn hoá âm lượng, xuất nhiều định dạng."),
 ("Dùng khi", "Có clip quay thật (CEO chào, lễ onboarding) cần ghép với hoạt hình, hoặc cần phụ đề tự động."),
 ("Quy tắc", "Giữ file gốc, làm việc trên bản sao, đặt tên có phiên bản (v1, v2).")],
 "Cảnh báo giảng viên: 'herk-edit-kit' là tên bạn cung cấp; xác minh nguồn, tính năng, cách cài và quyền sử dụng trước khi dạy, rồi bổ sung ảnh chụp thực tế vào slide này.")
cards("Thiết kế video giải thích hiệu quả", [
 ("Ngắn", "60–120 giây. Một video = một quy trình."),
 ("Có cấu trúc", "Vấn đề → các bước (tối đa 5–7) → ai liên hệ → kết."),
 ("Ít chữ", "Chữ trên màn hình chỉ là từ khoá; lời đọc kể phần còn lại."),
 ("Hình ảnh có nghĩa", "Mỗi bước 1 icon/hình, đánh số rõ ràng, dùng màu nhấn cho điểm quan trọng."),
 ("Dễ cập nhật", "Tách dữ liệu (nội dung) khỏi thiết kế (mẫu)."),
 ("Tiếp cận", "Có phụ đề, độ tương phản tốt, tốc độ đọc vừa phải.")], "Cho xem 1 video tốt và 1 video xấu để so sánh.")
lab("Dựng video không tiếng", "Có video MP4 đúng thương hiệu từ kịch bản của chính bạn",
 ["Cho agent đọc script.md + skill thương hiệu", "Yêu cầu dựng bằng Remotion (hoặc HyperFrames)", "Xem preview, sửa tối thiểu 3 lần bằng lời (màu, chữ, nhịp)", "Xuất MP4 bản nháp v1", "Chụp màn hình/ghi lại các prompt hữu ích"], "Dành nhiều thời gian nhất ở buổi này. Hỗ trợ học viên gặp lỗi cài đặt — lỗi thường gặp: thiếu Node.js, thiếu font tiếng Việt, cổng preview bị chiếm.")
bullets("Lỗi thường gặp & cách xử lý", [
 "Chữ tiếng Việt mất dấu/lỗi font → khai báo font hỗ trợ tiếng Việt trong brand kit",
 "Màu không đúng → yêu cầu dùng đúng mã HEX từ brand.md, không 'tự chọn'",
 "Chữ quá nhiều/quá nhỏ → giới hạn 20 từ/cảnh, cỡ tối thiểu",
 "Agent làm sai hướng → dừng, đọc lại plan, ra lệnh rõ hơn, đừng nói chung chung",
 "Lỗi chạy lệnh → copy nguyên thông báo lỗi dán cho agent, bảo 'tự sửa'"], "")
bullets("Tổng kết buổi 2 & bài tập", [
 "Brand kit là tài sản quan trọng nhất: làm một lần, dùng mãi",
 "Remotion/HyperFrames: dựng bằng code, agent làm giúp, bạn duyệt",
 "Bài tập: hoàn thiện video không tiếng v2, chuẩn bị lời đọc cuối cùng (có dấu câu, số đọc thành chữ)",
 "Cài sẵn VieNeu-TTS theo hướng dẫn (hoặc dùng máy giảng viên cấp)"], "")

# ============ BUỔI 3 ============
section("03", "Giọng đọc Việt & hoàn thiện", "VieNeu-TTS · Ghép video · Quy trình · Rủi ro & quản trị", "Buổi 3: hoàn thiện sản phẩm và quy trình vận hành lâu dài.")
cards("TTS là gì? VieNeu-TTS là gì?", [
 ("TTS (Text-to-Speech)", "Công nghệ biến văn bản thành giọng đọc. Model đọc chữ và tạo âm thanh."),
 ("VieNeu-TTS", "Model TTS mã nguồn mở tập trung vào tiếng Việt, hướng tới giọng tự nhiên; có thể chạy trên máy của bạn."),
 ("Lợi ích", "Không cần thuê đọc từng lần; dữ liệu nội bộ không phải gửi ra dịch vụ bên ngoài (nếu chạy cục bộ)."),
 ("Hạn chế", "Cần máy đủ mạnh hoặc chạy chậm hơn; đọc sai từ viết tắt, tên riêng, số nếu không chuẩn bị.")],
 "Xác minh trước: cách cài, yêu cầu phần cứng, giấy phép và phiên bản VieNeu-TTS hiện tại; chuẩn bị 1 máy demo.")
cards("Chuẩn bị lời đọc để giọng 'tự nhiên'", [
 ("Câu ngắn", "Mỗi câu 10–20 từ. Ngắt câu bằng dấu phẩy/chấm để có nhịp thở."),
 ("Viết số & viết tắt thành chữ", "'HR' → 'hắc rờ' hoặc 'nhân sự'; '15/12' → 'ngày mười lăm tháng mười hai'."),
 ("Tên riêng & thuật ngữ", "Lập bảng phát âm (từ điển) riêng cho công ty: tên sản phẩm, tên phòng ban, tiếng Anh."),
 ("Văn nói, không văn viết", "Dùng 'bạn', 'mình', câu đơn giản như đang trò chuyện.")], "Cho học viên nghe so sánh: văn bản chưa chuẩn bị vs đã chuẩn bị.")
flow("Quy trình tạo giọng đọc", [
 ("Chuẩn hoá chữ", "Số, viết tắt, tên riêng"),
 ("Chọn giọng", "Nam/nữ, tốc độ, cảm xúc phù hợp tone"),
 ("Tạo thử câu", "Nghe từng câu, sửa chỗ đọc sai"),
 ("Tạo toàn bộ", "Mỗi cảnh một file âm thanh"),
 ("Kiểm tra", "Nghe cả bài, nhờ đồng nghiệp nghe thử")], "Tạo âm thanh theo từng cảnh giúp sửa 1 câu mà không phải làm lại cả bài.")
cards("Ghép giọng đọc vào video", [
 ("Căn thời lượng", "Cảnh dài bằng thời lượng file âm thanh + khoảng nghỉ ~0.4 giây."),
 ("Nhạc nền", "Nhỏ hơn giọng (khoảng -20 dB), tránh nhạc có bản quyền không rõ."),
 ("Phụ đề", "Tạo từ chính lời đọc; kiểm tra chính tả tiếng Việt."),
 ("Xuất file", "MP4 1080p cho máy tính; bản dọc 9:16 nếu đăng trên điện thoại/Zalo.")], "Demo: agent tự đọc thời lượng file âm thanh rồi cập nhật timeline trong Remotion.")
lab("Lồng tiếng & hoàn thiện", "Video hoàn chỉnh có giọng đọc Việt, phụ đề, đúng thương hiệu",
 ["Chuẩn hoá lời đọc (số, viết tắt, tên riêng)", "Tạo giọng bằng VieNeu-TTS, nghe & sửa các câu đọc sai", "Ghép âm thanh vào video, căn thời lượng từng cảnh", "Thêm phụ đề và nhạc nền nhỏ", "Xuất MP4 bản v2, cho 1 bạn nghe thử và góp ý"], "")
cards("Quy trình chuẩn sản xuất video HR", [
 ("1. Yêu cầu", "Chủ sở hữu nội dung (phòng ban) xác nhận quy trình đúng."),
 ("2. Kịch bản", "AI soạn → HR rà soát → bộ phận liên quan duyệt."),
 ("3. Dựng & lồng tiếng", "Agent dùng skill thương hiệu + mẫu có sẵn."),
 ("4. Kiểm tra", "Checklist: đúng nội dung, đúng brand, phát âm, phụ đề."),
 ("5. Phát hành", "Đăng nơi lưu chung, ghi phiên bản & ngày hiệu lực."),
 ("6. Cập nhật", "Khi quy trình đổi: sửa dữ liệu → xuất lại, thông báo.")], "Đây là slide quan trọng để mang về áp dụng. Gợi ý lưu mọi thứ trong một repo/thư mục chung.")
cards("Rủi ro & quản trị khi dùng AI trong HR", [
 ("Dữ liệu cá nhân", "Không đưa lương, hồ sơ, thông tin nhạy cảm vào AI. Dùng dữ liệu mẫu ẩn danh."),
 ("Sai sót nội dung", "AI có thể bịa chính sách. Luôn đối chiếu văn bản gốc và có người duyệt."),
 ("Bản quyền", "Kiểm tra giấy phép font, nhạc, hình ảnh, thư viện (Remotion…), model giọng nói."),
 ("Giọng nói", "Không nhân bản giọng người thật nếu chưa có sự đồng ý rõ ràng bằng văn bản."),
 ("Minh bạch", "Ghi rõ video có sử dụng AI nếu chính sách công ty yêu cầu."),
 ("Quy định nội bộ", "Thống nhất với IT/pháp chế: công cụ nào được phép dùng.")], "Khuyến khích công ty ban hành quy định ngắn 1 trang về dùng AI.")
cards("Ứng dụng tiếp theo cho HR", [
 ("Onboarding", "Chuỗi video ngày 1, tuần 1, tháng 1."),
 ("Chính sách & quy trình", "Nghỉ phép, phúc lợi, bảo hiểm, an toàn lao động."),
 ("Đào tạo nội bộ", "Hướng dẫn dùng phần mềm, văn hoá công ty, tuyển dụng nội bộ."),
 ("Truyền thông", "Bản tin ngắn hằng tháng, thông báo thay đổi chính sách."),
 ("Đa ngôn ngữ", "Cùng nội dung, thêm bản tiếng Anh."),
 ("Thư viện mẫu", "Kho mẫu video để phòng ban khác dùng lại.")], "")
bullets("Lộ trình áp dụng sau khoá học", [
 "Tuần 1–2: làm 1 video thật cho 1 quy trình, thu thập phản hồi nhân viên",
 "Tháng 1: hoàn thiện brand kit + skill, làm 3–5 video cốt lõi",
 "Tháng 2–3: lập thư viện mẫu, quy trình duyệt, đào tạo thêm người làm",
 "Đo hiệu quả: số lượt xem, số câu hỏi lặp lại cho HR giảm, thời gian onboarding",
 "Cập nhật công cụ định kỳ vì AI thay đổi rất nhanh"], "")
bullets("Tổng kết khoá học", [
 "Model = bộ não · Prompt = giao việc · Agent = người làm · Skill = sổ tay",
 "Brand kit giúp mọi video đúng chất công ty",
 "Remotion/HyperFrames dựng hình · VieNeu-TTS tạo giọng Việt · Edit kit hoàn thiện",
 "AI làm nhanh, CON NGƯỜI chịu trách nhiệm nội dung và dữ liệu",
 "Hỏi đáp · nhận xét sản phẩm cuối khoá"], "Trình chiếu video của học viên, chọn video hay nhất.")
title_slide("Cảm ơn! Hỏi & Đáp", "Tài liệu: slide · checklist cài đặt · mẫu brand.md · mẫu kịch bản", "")

prs.save("khoa-hoc-ai-video-hr.pptx")
print(count[0], "slides")
