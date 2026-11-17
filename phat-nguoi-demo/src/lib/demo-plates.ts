// Biển có kịch bản cố định ở chế độ mock (xem momo/mock.ts) để thử từng trạng thái.
export const DEMO_PLATES = [
  { plate: "30A84812", note: "2 lỗi chưa xử phạt" },
  { plate: "76A03285", note: "chỉ có lỗi đã xử phạt" },
  { plate: "51F12345", note: "không có vi phạm" },
  { plate: "88A00000", note: "nguồn trả lỗi tra cứu" },
  { plate: "99X99999", note: "ngoài giờ làm việc" },
] as const;
