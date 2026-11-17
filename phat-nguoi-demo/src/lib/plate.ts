export const VEHICLE_TYPES = { car: 1, motorbike: 30, electricBike: 40 } as const;
export type VehicleType = (typeof VEHICLE_TYPES)[keyof typeof VEHICLE_TYPES];

export const VEHICLE_TYPE_LABEL: Record<number, string> = {
  1: "Ô tô",
  10: "Xe khác",
  20: "Rơ moóc",
  30: "Xe máy",
  40: "Xe máy điện",
};

export function isVehicleType(v: unknown): v is VehicleType {
  return v === 1 || v === 30 || v === 40;
}

/** Bỏ dấu cách, chấm, gạch; viết hoa; Đ → D (biển có seri Đ gửi lên dạng D). */
export function normalizePlate(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/Đ/g, "D")
    .replace(/[^A-Z0-9]/g, "");
}

// 2 số tỉnh + 1-2 chữ seri + 4-6 chữ số (xe máy có thêm 1 số ở seri, vd 59C1 123.45).
const PLATE_RE = /^(\d{2})([A-Z]{1,2})(\d{4,6})$/;

export function isValidPlate(normalized: string): boolean {
  const m = PLATE_RE.exec(normalized);
  if (!m) return false;
  return Number(m[1]) >= 11;
}

/**
 * 30A84812 → 30A-848.12 ; 59C112345 → 59C1-123.45. Chỉ để hiển thị.
 * Ô tô 5 số sau seri là số xe (30A-848.12); xe máy/xe điện 5 số thì số đầu thuộc seri (59C1-1234).
 */
export function formatPlate(normalized: string, vehicleType: number = 1): string {
  const m = PLATE_RE.exec(normalized);
  if (!m) return normalized;
  const [, province, letters, digits] = m as unknown as [string, string, string, string];
  const bike = vehicleType === 30 || vehicleType === 40;
  const hasSeriesDigit = digits.length === 6 || (bike && digits.length === 5);
  const seriesDigit = hasSeriesDigit ? digits.slice(0, 1) : "";
  const number = hasSeriesDigit ? digits.slice(1) : digits;
  const body = number.length === 5 ? `${number.slice(0, 3)}.${number.slice(3)}` : number;
  return `${province}${letters}${seriesDigit}-${body}`;
}
