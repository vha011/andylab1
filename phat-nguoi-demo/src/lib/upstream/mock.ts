import { ProviderError } from "../errors";
import type { CriminalRecord, LookupInput, ViolationProvider, ViolationResult } from "../types";

// Dữ liệu mô phỏng, KHÔNG phải kết quả thật. Nội dung lấy theo ví dụ trong tài liệu API.
const POOL: Omit<CriminalRecord, "plate" | "status">[] = [
  {
    content: "Điều khiển xe chạy quá tốc độ quy định từ 05 km/h đến dưới 10 km/h",
    time: "2026-06-10T01:15:00.000Z",
    detectedBy: "Đội Cảnh sát giao thông số 1 - Công an TP. Hà Nội",
    location: "Đường Nguyễn Trãi, Phường Thanh Xuân Trung, Quận Thanh Xuân, TP. Hà Nội",
    handlingAgency: "Cục Cảnh sát giao thông - Bộ Công an",
    agencyAddress: "Số 2 Thiền Quang, Nguyễn Du, Hai Bà Trưng, Hà Nội",
    contact: "024.38521234",
    penalties: ["Khung phạt: 400.000–600.000 VNĐ", "Trừ điểm GPLX: 0"],
  },
  {
    content: "Không chấp hành hiệu lệnh của đèn tín hiệu giao thông",
    time: "2026-06-12T10:45:00.000Z",
    detectedBy: "Đội Cảnh sát giao thông số 3 - Công an TP. Hà Nội",
    location: "Ngã tư Đinh Tiên Hoàng - Tràng Thi, Quận Hoàn Kiếm, TP. Hà Nội",
    handlingAgency: "Cục Cảnh sát giao thông - Bộ Công an",
    agencyAddress: "Số 89 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội",
    contact: "024.39431234",
    penalties: ["Khung phạt: 18.000.000–20.000.000 VNĐ", "Trừ điểm GPLX: 4"],
  },
  {
    content: "Dừng xe, đỗ xe trên đường bộ trái quy định",
    time: "2026-05-02T13:20:00.000Z",
    detectedBy: "Phòng Cảnh sát giao thông - Công an TP. Hồ Chí Minh",
    location: "Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    handlingAgency: "Phòng Cảnh sát giao thông - Công an TP. Hồ Chí Minh",
    agencyAddress: "Số 60 Nguyễn Văn Cừ, Quận 5, TP. Hồ Chí Minh",
    contact: "",
    penalties: ["Khung phạt: 800.000–1.000.000 VNĐ", "Trừ điểm GPLX: 0"],
  },
];

const rec = (i: number, status: string, plate: string): CriminalRecord => ({ ...POOL[i % POOL.length]!, plate, status });

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Biển có kịch bản cố định (danh sách ở demo-plates.ts); biển khác ra kết quả ổn định theo hash. */

export function mockResult(plate: string, vehicleType: number): ViolationResult {
  const base = { plate, plateColor: "WHITE", vehicleType };
  if (plate === "99X99999") throw new ProviderError("EXTERNAL_OUT_OF_WORKING_HOUR", 400);
  if (plate === "88A00000") return { ...base, hasCriminal: 2, records: [] };
  if (plate === "30A84812") return { ...base, hasCriminal: 1, records: [rec(0, "Chưa xử phạt", plate), rec(1, "Chưa xử phạt", plate)] };
  if (plate === "76A03285") return { ...base, hasCriminal: 0, records: [rec(0, "Đã xử phạt", plate), rec(1, "Đã xử phạt", plate)] };
  if (plate === "51F12345") return { ...base, hasCriminal: 0, records: [] };

  const h = hash(plate);
  const pending = h % 4 === 2 ? 1 : h % 4 === 3 ? 2 : 0;
  if (pending === 0) return { ...base, hasCriminal: 0, records: [] };
  return { ...base, hasCriminal: 1, records: Array.from({ length: pending }, (_, i) => rec((h >>> 3) + i, "Chưa xử phạt", plate)) };
}

export function createMockProvider(delayMs = 500): ViolationProvider {
  return {
    source: "mock",
    async check({ plate, vehicleType }: LookupInput) {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return mockResult(plate, vehicleType);
    },
  };
}
