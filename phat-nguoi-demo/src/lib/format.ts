const VN_TZ = "Asia/Ho_Chi_Minh";

/**
 * Thời gian vi phạm có hai dạng: ISO UTC ("2024-11-10T01:41:00.000Z", trả về từ API tra cứu)
 * và "yyyy-MM-dd HH:mm:ss" không múi giờ (mẫu callback), coi là giờ Việt Nam.
 */
export function formatViolationTime(value: string | null | undefined): string {
  if (!value) return "—";
  const local = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?$/.exec(value);
  if (local) return `${local[4]}:${local[5]} ${local[3]}/${local[2]}/${local[1]}`;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const parts = new Intl.DateTimeFormat("vi-VN", {
    timeZone: VN_TZ,
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("hour")}:${get("minute")} ${get("day")}/${get("month")}/${get("year")}`;
}

/** "12321.5.3.a.01.Điều khiển..." → bỏ mã điều khoản ở đầu, giữ nội dung. */
export function cleanViolationContent(content: string): string {
  return content.replace(/^[\d.]+[a-zA-Z]?\.?\d*\.(?=\D)/, "").trim() || content;
}
