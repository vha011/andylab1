import type { ViolationResult } from "./types";

export type SummaryKind = "error" | "pending" | "history" | "clear";

export interface Summary {
  kind: SummaryKind;
  pending: number;
  handled: number;
}

/**
 * Cờ hasCriminal không đủ để kết luận: tài liệu MoMo có mẫu hasCriminal=0 nhưng vẫn kèm bản ghi "Đã xử phạt".
 * Nên dựa vào trạng thái từng bản ghi. Trạng thái không nhận ra (kể cả "Lỗi tra cứu") là KHÔNG xác định,
 * tuyệt đối không được coi là sạch: nếu không có lỗi chưa xử phạt thì báo lỗi tra cứu.
 */
const KNOWN_STATUS = ["Chưa xử phạt", "Đã xử phạt", "Không vi phạm"];

export function summarize(r: ViolationResult): Summary {
  const pending = r.records.filter((x) => x.status === "Chưa xử phạt").length;
  const handled = r.records.filter((x) => x.status === "Đã xử phạt").length;
  const unknown = r.records.filter((x) => !KNOWN_STATUS.includes(x.status)).length;
  if (pending > 0) return { kind: "pending", pending, handled };
  if (r.hasCriminal === 2 || unknown > 0) return { kind: "error", pending, handled };
  if (r.hasCriminal === 1) return { kind: "pending", pending, handled };
  if (handled > 0) return { kind: "history", pending, handled };
  return { kind: "clear", pending, handled };
}

export const NOTIFY_TYPE_LABEL: Record<number, string> = {
  1: "Phát hiện xe có lỗi phạt nguội",
  2: "Xe hiện không có lỗi vi phạm",
  3: "Xe phát sinh lỗi phạt nguội mới",
  4: "Lỗi đã được xử lý xong",
};
