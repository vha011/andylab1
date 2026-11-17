import { afterEach, describe, expect, it, vi } from "vitest";
import { createNonceStore, receiveWebhook, sign, simulateWebhook, verifyWebhook } from "./webhook";
import { createRateLimiter } from "./rate-limit";
import type { WebhookCredentials } from "./config";

const cred: WebhookCredentials = { clientId: "c1", apiKey: "a1", secretKey: "s1" };
const NOW = 1_800_000_000_000;
const hdrs = (over: Record<string, string> = {}, ts = String(NOW), nonce = "0123456789abcdef") =>
  new Headers({ timestamp: ts, nonce, signature: sign(cred, ts, nonce), ...over });

afterEach(() => vi.unstubAllEnvs());

describe("verifyWebhook", () => {
  it("chữ ký đúng được chấp nhận; header X- cũng được", () => {
    expect(verifyWebhook(hdrs(), cred, createNonceStore(), NOW)).toEqual({ ok: true });
    const h = new Headers({ "x-timestamp": String(NOW), "x-nonce": "abcdef0123456789", "x-signature": sign(cred, String(NOW), "abcdef0123456789") });
    expect(verifyWebhook(h, cred, createNonceStore(), NOW).ok).toBe(true);
  });

  it("thiếu header, chữ ký sai, sai khóa", () => {
    expect(verifyWebhook(new Headers(), cred, createNonceStore(), NOW)).toEqual({ ok: false, reason: "missing_headers" });
    expect(verifyWebhook(hdrs({ signature: "0".repeat(64) }), cred, createNonceStore(), NOW)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyWebhook(hdrs({ signature: "xyz" }), cred, createNonceStore(), NOW)).toEqual({ ok: false, reason: "bad_signature" });
    expect(verifyWebhook(hdrs(), { ...cred, secretKey: "khác" }, createNonceStore(), NOW).ok).toBe(false);
  });

  it("timestamp lệch quá 5 phút bị từ chối, trong 5 phút thì được", () => {
    expect(verifyWebhook(hdrs({}, String(NOW - 301_000)), cred, createNonceStore(), NOW)).toEqual({ ok: false, reason: "stale_timestamp" });
    expect(verifyWebhook(hdrs({}, String(NOW + 301_000)), cred, createNonceStore(), NOW).ok).toBe(false);
    expect(verifyWebhook(hdrs({}, String(NOW - 299_000)), cred, createNonceStore(), NOW).ok).toBe(true);
  });

  it("chống replay: nonce dùng lại bị từ chối, hết 10 phút thì dùng lại được", () => {
    let t = NOW;
    const nonces = createNonceStore(() => t);
    expect(verifyWebhook(hdrs(), cred, nonces, NOW).ok).toBe(true);
    expect(verifyWebhook(hdrs(), cred, nonces, NOW)).toEqual({ ok: false, reason: "replayed_nonce" });
    t += 10 * 60_000 + 1;
    expect(verifyWebhook(hdrs({}, String(t)), cred, nonces, t).ok).toBe(true);
  });

  it("request ký sai không làm cháy nonce hợp lệ", () => {
    const nonces = createNonceStore(() => NOW);
    expect(verifyWebhook(hdrs({ signature: "0".repeat(64) }), cred, nonces, NOW).ok).toBe(false);
    expect(verifyWebhook(hdrs(), cred, nonces, NOW).ok).toBe(true);
  });
});

describe("receiveWebhook", () => {
  const body = { callbackData: { notifyType: 3, fineStatus: 1, refreshDate: "16/06/2026", criminalRecords: [{ crimeRecordContent: "x", crimeRecordStatus: "Chưa xử phạt" }], customerData: { customerIdentifier: "0382716917" }, vehicleData: { vehicleIdentity: "30A84812" } } };
  const mk = () => ({ events: [] as never[], nonces: createNonceStore() });

  function stubLive() {
    vi.stubEnv("MOMO_MODE", "live");
    vi.stubEnv("MOMO_WEBHOOK_CLIENT_ID", cred.clientId);
    vi.stubEnv("MOMO_WEBHOOK_API_KEY", cred.apiKey);
    vi.stubEnv("MOMO_WEBHOOK_SECRET", cred.secretKey);
  }
  const post = (headers: Headers, payload: unknown = body) => new Request("http://x/api/webhooks/momo", { method: "POST", headers, body: typeof payload === "string" ? payload : JSON.stringify(payload) });
  const now = () => String(Date.now());

  it("200 và lưu sự kiện khi hợp lệ; 401 khi ký sai", async () => {
    stubLive();
    const s = mk();
    const ts = now();
    const ok = await receiveWebhook(post(hdrs({}, ts, "aaaaaaaaaaaaaaaa")), s);
    expect(ok.status).toBe(200);
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ plate: "30A84812", notifyType: 3, customerIdentifier: "0382716917" });
    const bad = await receiveWebhook(post(hdrs({ signature: "0".repeat(64) }, ts, "bbbbbbbbbbbbbbbb")), s);
    expect(bad.status).toBe(401);
    expect(s.events).toHaveLength(1);
  });

  it("replay cùng nonce: lần hai bị 401", async () => {
    stubLive();
    const s = mk();
    const ts = now();
    expect((await receiveWebhook(post(hdrs({}, ts, "cccccccccccccccc")), s)).status).toBe(200);
    expect((await receiveWebhook(post(hdrs({}, ts, "cccccccccccccccc")), s)).status).toBe(401);
  });

  it("JSON hỏng hoặc sai cấu trúc là 400 (chữ ký đúng nên MoMo không cần retry)", async () => {
    stubLive();
    const ts = now();
    expect((await receiveWebhook(post(hdrs({}, ts, "dddddddddddddddd"), "{not json"), mk())).status).toBe(400);
    expect((await receiveWebhook(post(hdrs({}, ts, "eeeeeeeeeeeeeeee"), { foo: 1 }), mk())).status).toBe(400);
  });

  it("live mà chưa cấu hình khóa: từ chối, không nhận request không ký", async () => {
    vi.stubEnv("MOMO_MODE", "live");
    vi.stubEnv("MOMO_WEBHOOK_SECRET", "");
    expect((await receiveWebhook(post(new Headers()), mk())).status).toBe(503);
  });

  it("simulate chạy end-to-end qua đúng đường xác thực ở mock, và bị tắt ở live", async () => {
    vi.stubEnv("MOMO_MODE", "mock");
    const res = await simulateWebhook("30A84812", 1, "0382716917");
    expect(res.status).toBe(200);
    vi.stubEnv("MOMO_MODE", "live");
    expect((await simulateWebhook("30A84812", 1, "0382716917")).status).toBe(404);
  });
});

describe("rate limiter", () => {
  it("chặn sau N lần trong cửa sổ và mở lại khi hết cửa sổ", () => {
    let t = 0;
    const rl = createRateLimiter(2, 1000, () => t);
    expect([rl.allow("a"), rl.allow("a"), rl.allow("a"), rl.allow("b")]).toEqual([true, true, false, true]);
    t = 1001;
    expect(rl.allow("a")).toBe(true);
  });
});
