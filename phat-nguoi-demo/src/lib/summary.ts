import type { ViolationResult } from "./types";

export type SummaryKind = "error" | "pending" | "history" | "clear";

export interface Summary {
  kind: SummaryKind;
  pending: number;
  handled: number;
}

/**
 * Cờ hasCriminal không đủ để kết luận: tài liệu MoMo có mẫu hasCriminal=0 nhưng vẫn kèm bản ghi "Đã xử phạt".
 * Nên dựa vào trạng thái từng bản ghi để người dùng không bị báo "sạch" khi còn lỗi chưa xử phạt.
 */
export function summarize(r: ViolationResult): Summary {
  const pending = r.records.filter((x) => x.status === "Chưa xử phạt").length;
  const handled = r.records.filter((x) => x.status === "Đã xử phạt").length;
  if (r.hasCriminal === 2) return { kind: "error", pending, handled };
  if (pending > 0 || r.hasCriminal === 1) return { kind: "pending", pending, handled };
  if (handled > 0) return { kind: "history", pending, handled };
  return { kind: "clear", pending, handled };
}

export const NOTIFY_TYPE_LABEL: Record<number, string> = {
  1: "Phát hiện xe có lỗi phạt nguội",
  2: "Xe hiện không có lỗi vi phạm",
  3: "Xe phát sinh lỗi phạt nguội mới",
  4: "Lỗi đã được xử lý xong",
};
