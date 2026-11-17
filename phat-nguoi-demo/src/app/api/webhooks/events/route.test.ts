import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

beforeEach(() => vi.stubEnv("MOMO_MODE", "mock"));
afterEach(() => vi.unstubAllEnvs());

const post = (body: string) => POST(new Request("http://x/api/webhooks/events", { method: "POST", headers: { "content-type": "application/json" }, body }));

describe("/api/webhooks/events", () => {
  it.each(["null", "123", '"x"', "[]", "{hỏng", "{}"])("body sai %j là 400, không ném lỗi", async (b) => {
    expect((await post(b)).status).toBe(400);
  });

  it("biển lỗi tra cứu là 409, biển hợp lệ là 200 và hiện trong danh sách", async () => {
    expect((await post(JSON.stringify({ plate: "88A00000", vehicleType: 1 }))).status).toBe(409);
    expect((await post(JSON.stringify({ plate: "30A84812", vehicleType: 1 }))).status).toBe(200);
    const { events } = await GET().json();
    expect(events[0]).toMatchObject({ plate: "30A84812", notifyType: 3 });
  });

  it("ở live cả GET lẫn POST đều 404 (không lộ dữ liệu khách hàng)", async () => {
    vi.stubEnv("MOMO_MODE", "live");
    expect(GET().status).toBe(404);
    expect((await post(JSON.stringify({ plate: "30A84812", vehicleType: 1 }))).status).toBe(404);
  });
});
