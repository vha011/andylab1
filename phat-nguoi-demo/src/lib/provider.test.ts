import { describe, expect, it, vi } from "vitest";
import { describeError, ProviderError } from "./errors";
import { createLiveProvider } from "./upstream/live";
import { mockResult } from "./upstream/mock";
import { parseCheckViolationResponse } from "./upstream/parse";
import { summarize } from "./summary";
import type { ViolationResult } from "./types";

// Mẫu rút gọn từ tài liệu API (userCheckViolation).
const sample = {
  statusCode: 200,
  error: null,
  message: "Success",
  data: {
    vehicleIdentity: "76A03285",
    vehiclePlateColor: "WHITE",
    vehicleType: 1,
    hasCriminal: 0,
    criminalRecords: [
      {
        customerRecordPlatenumber: "76A03285",
        crimeRecordContent: "12321.5.5.a.01.Không chấp hành hiệu lệnh của đèn tín hiệu giao thông",
        crimeRecordStatus: "Đã xử phạt",
        crimeRecordTime: "2024-06-01T23:14:00.000Z",
        crimeRecordPIC: "Đội CSGT",
        crimeRecordLocation: "Đà Nẵng",
        crimeRecordContact: "",
        crimeRecordAgency: "Phòng CSGT",
        crimeRecordAddressPIC: "Quảng Ngãi",
        violationPenalties: ["Khung phạt: 18.000.000–20.000.000 VNĐ", "Trừ điểm GPLX: 4"],
      },
    ],
  },
};

describe("parseCheckViolationResponse", () => {
  it("đọc đúng mẫu thành công", () => {
    const r = parseCheckViolationResponse(200, sample);
    expect(r.plate).toBe("76A03285");
    expect(r.hasCriminal).toBe(0);
    expect(r.records).toHaveLength(1);
    expect(r.records[0]).toMatchObject({ status: "Đã xử phạt", penalties: ["Khung phạt: 18.000.000–20.000.000 VNĐ", "Trừ điểm GPLX: 4"] });
  });

  it("chuyển mã lỗi của nguồn dữ liệu thành ProviderError", () => {
    expect(() => parseCheckViolationResponse(400, { statusCode: 400, error: "INVALID_PLATE_NUMBER" })).toThrow(expect.objectContaining({ code: "INVALID_PLATE_NUMBER" }));
    expect(() => parseCheckViolationResponse(401, { statusCode: 401, error: "Unauthorized" })).toThrow(expect.objectContaining({ code: "Unauthorized" }));
  });

  it("sai định dạng thì UNKNOWN_ERROR, không crash", () => {
    for (const bad of [null, "x", [], { data: null }, {}]) {
      expect(() => parseCheckViolationResponse(200, bad)).toThrow(expect.objectContaining({ code: "UNKNOWN_ERROR" }));
    }
  });

  it("hasCriminal lạ coi là lỗi (2); thiếu danh sách bản ghi coi là rỗng", () => {
    expect(parseCheckViolationResponse(200, { data: { hasCriminal: 9 } })).toMatchObject({ hasCriminal: 2, records: [] });
  });

  it("danh sách bản ghi hỏng thì lỗi, không âm thầm thành rỗng (tránh báo sạch nhầm)", () => {
    for (const criminalRecords of ["x", { a: 1 }, [null], [3], [{ crimeRecordContent: "ok" }, "bad"]]) {
      expect(() => parseCheckViolationResponse(200, { data: { hasCriminal: 0, criminalRecords } })).toThrow(expect.objectContaining({ code: "UNKNOWN_ERROR" }));
    }
  });

  it("bản ghi thiếu trạng thái nhận trạng thái 'Lỗi tra cứu'", () => {
    expect(parseCheckViolationResponse(200, { data: { hasCriminal: 0, criminalRecords: [{ crimeRecordContent: "ok" }] } }).records[0]?.status).toBe("Lỗi tra cứu");
  });
});

describe("summarize", () => {
  const base: ViolationResult = { plate: "x", plateColor: "WHITE", vehicleType: 1, hasCriminal: 0, records: [] };
  const rec = (status: string) => ({ ...sample.data.criminalRecords[0]!, plate: "x", content: "c", status, time: "", detectedBy: "", location: "", handlingAgency: "", agencyAddress: "", contact: "", penalties: [] });

  it("hasCriminal=0 nhưng chỉ có lỗi đã xử phạt: lịch sử, không phải 'sạch'", () => {
    expect(summarize({ ...base, records: [rec("Đã xử phạt")] }).kind).toBe("history");
  });
  it("còn lỗi chưa xử phạt dù cờ = 0 vẫn báo có vi phạm", () => {
    expect(summarize({ ...base, records: [rec("Chưa xử phạt")] }).kind).toBe("pending");
  });
  it("cờ lỗi = 2 là error, không bao giờ là clear", () => {
    expect(summarize({ ...base, hasCriminal: 2 }).kind).toBe("error");
  });
  it("không có gì là clear", () => expect(summarize(base).kind).toBe("clear"));

  it("trạng thái không nhận ra hoặc 'Lỗi tra cứu' không bao giờ là clear/history", () => {
    expect(summarize({ ...base, records: [rec("Lỗi tra cứu")] }).kind).toBe("error");
    expect(summarize({ ...base, records: [rec("")] }).kind).toBe("error");
    expect(summarize({ ...base, records: [rec("Đã xử phạt"), rec("Trạng thái mới")] }).kind).toBe("error");
  });
  it("có lỗi chưa xử phạt thì ưu tiên báo vi phạm dù có bản ghi lỗi khác", () => {
    expect(summarize({ ...base, records: [rec("Chưa xử phạt"), rec("Lỗi tra cứu")] }).kind).toBe("pending");
  });
  it("hasCriminal=1 mà không có bản ghi vẫn báo có vi phạm", () => {
    expect(summarize({ ...base, hasCriminal: 1 }).kind).toBe("pending");
  });
});

describe("mock", () => {
  it("biển kịch bản cố định", () => {
    expect(summarize(mockResult("30A84812", 1)).pending).toBe(2);
    expect(summarize(mockResult("76A03285", 1)).kind).toBe("history");
    expect(summarize(mockResult("51F12345", 1)).kind).toBe("clear");
    expect(summarize(mockResult("88A00000", 1)).kind).toBe("error");
    expect(() => mockResult("99X99999", 1)).toThrow(ProviderError);
  });
  it("biển khác ổn định giữa các lần gọi", () => {
    expect(mockResult("43B01234", 1)).toEqual(mockResult("43B01234", 1));
  });
});

describe("live provider", () => {
  const cfg = { baseUrl: "https://example.test/base", apiKey: "k-123", apiKeyHeader: "x-api-key" };

  it("gọi đúng đường dẫn, gửi key ở header, không đưa key vào URL hay body", async () => {
    const f = vi.fn(async () => Response.json(sample));
    const r = await createLiveProvider(cfg, f as unknown as typeof fetch).check({ plate: "76A03285", vehicleType: 1 });
    expect(r.plate).toBe("76A03285");
    const [url, init] = f.mock.calls[0] as unknown as [URL, RequestInit];
    expect(String(url)).toBe("https://example.test/PartnerAPI/CustomerCriminalRecord/user/userCheckViolation");
    expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k-123");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({ licensePlates: "76A03285", vehicleType: 1 });
    expect(String(init.body)).not.toContain("k-123");
    expect(String(url)).not.toContain("k-123");
  });

  it("lỗi mạng và timeout được map, không lộ chi tiết", async () => {
    const net = createLiveProvider(cfg, (async () => Promise.reject(new TypeError("fetch failed"))) as unknown as typeof fetch);
    await expect(net.check({ plate: "76A03285", vehicleType: 1 })).rejects.toMatchObject({ code: "EXTERNAL_API_ERROR" });
    const slow = createLiveProvider(cfg, (async () => Promise.reject(Object.assign(new Error("t"), { name: "TimeoutError" }))) as unknown as typeof fetch);
    await expect(slow.check({ plate: "76A03285", vehicleType: 1 })).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("body không phải JSON", async () => {
    const p = createLiveProvider(cfg, (async () => new Response("<html>", { status: 502 })) as unknown as typeof fetch);
    await expect(p.check({ plate: "76A03285", vehicleType: 1 })).rejects.toMatchObject({ code: "UNKNOWN_ERROR" });
  });
});

describe("describeError", () => {
  it("mã lạ thành UNKNOWN_ERROR, không đưa mã nội bộ ra ngoài", () => {
    expect(describeError("SOMETHING_INTERNAL").code).toBe("UNKNOWN_ERROR");
    expect(describeError("INVALID_PLATE_NUMBER").httpStatus).toBe(400);
  });
});
