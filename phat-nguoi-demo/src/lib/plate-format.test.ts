import { describe, expect, it } from "vitest";
import { cleanViolationContent, formatViolationTime } from "./format";
import { formatPlate, isValidPlate, normalizePlate } from "./plate";

describe("plate", () => {
  it("chuẩn hóa dấu, khoảng trắng, chữ thường và Đ", () => {
    expect(normalizePlate("30a-848.12")).toBe("30A84812");
    expect(normalizePlate(" 29 MĐ1 123.45 ")).toBe("29MD112345");
  });

  it.each(["30A84812", "51F1234", "59C112345", "29MD112345", "76A03285"])("chấp nhận %s", (p) => expect(isValidPlate(p)).toBe(true));

  it.each(["", "ABC", "3A84812", "30A8", "30A8481234567", "00A12345", "10A12345", "30-84812", "'; DROP--"])("từ chối %j", (p) => expect(isValidPlate(normalizePlate(p))).toBe(false));

  it("định dạng hiển thị", () => {
    expect(formatPlate("30A84812")).toBe("30A-848.12");
    expect(formatPlate("51F1234")).toBe("51F-1234");
    expect(formatPlate("59C112345")).toBe("59C1-123.45");
    expect(formatPlate("không hợp lệ")).toBe("không hợp lệ");
  });

  it("xe máy 5 số sau seri: số đầu thuộc seri, ô tô thì không", () => {
    expect(formatPlate("59C11234", 30)).toBe("59C1-1234");
    expect(formatPlate("59C11234", 40)).toBe("59C1-1234");
    expect(formatPlate("59C11234", 1)).toBe("59C-112.34");
    expect(formatPlate("30A84812", 30)).toBe("30A8-4812");
  });
});

describe("format", () => {
  it("ISO UTC sang giờ Việt Nam", () => {
    expect(formatViolationTime("2024-11-10T01:41:00.000Z")).toBe("08:41 10/11/2024");
    expect(formatViolationTime("2024-06-01T23:14:00.000Z")).toBe("06:14 02/06/2024");
  });
  it("chuỗi không múi giờ coi là giờ VN, giữ nguyên", () => {
    expect(formatViolationTime("2026-06-10 08:15:00")).toBe("08:15 10/06/2026");
  });
  it("giá trị rỗng hoặc lạ", () => {
    expect(formatViolationTime("")).toBe("—");
    expect(formatViolationTime("không rõ")).toBe("không rõ");
  });
  it("bỏ mã điều khoản ở đầu nội dung", () => {
    expect(cleanViolationContent("12321.5.3.a.01.Điều khiển xe chạy quá tốc độ")).toBe("Điều khiển xe chạy quá tốc độ");
    expect(cleanViolationContent("Không chấp hành hiệu lệnh")).toBe("Không chấp hành hiệu lệnh");
  });
});
