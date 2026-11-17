import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

beforeEach(() => vi.stubEnv("MOMO_MOCK_DELAY_MS", "0"));
afterEach(() => vi.unstubAllEnvs());

let n = 0;
const call = (body: unknown, ip = `10.0.0.${++n}`) =>
  POST(new Request("http://x/api/lookup", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": ip }, body: typeof body === "string" ? body : JSON.stringify(body) }));

describe("POST /api/lookup (mock)", () => {
  it("biển hợp lệ trả kết quả, no-store, nhận cả biển có dấu", async () => {
    const res = await call({ plate: "30a-848.12", vehicleType: 1 });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, source: "mock", result: { plate: "30A84812", hasCriminal: 1 } });
    expect(body.result.records).toHaveLength(2);
  });

  it.each([{}, { plate: 123, vehicleType: 1 }, { plate: "30A84812" }, { plate: "30A84812", vehicleType: 7 }, { plate: "abc", vehicleType: 1 }, "{hỏng"])("đầu vào sai %j là 400", async (b) => {
    const res = await call(b);
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_PLATE_NUMBER");
  });

  it("lỗi nguồn được map sang thông báo tiếng Việt, mã trạng thái phù hợp", async () => {
    const res = await call({ plate: "99X99999", vehicleType: 1 });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ ok: false, error: { code: "EXTERNAL_OUT_OF_WORKING_HOUR", retryable: true } });
  });

  it("giới hạn tần suất theo IP", async () => {
    const ip = "203.0.113.9";
    const codes: number[] = [];
    for (let i = 0; i < 10; i++) codes.push((await call({ plate: "51F12345", vehicleType: 1 }, ip)).status);
    expect(codes.slice(0, 8).every((c) => c === 200)).toBe(true);
    expect(codes.slice(8)).toEqual([429, 429]);
  });

  it("live thiếu cấu hình: lỗi 500 gọn, không lộ biến môi trường", async () => {
    vi.stubEnv("MOMO_MODE", "live");
    vi.stubEnv("MOMO_BASE_URL", "");
    vi.stubEnv("MOMO_API_KEY", "");
    const res = await call({ plate: "51F12345", vehicleType: 1 });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toMatch(/MOMO_|http/);
  });
});
