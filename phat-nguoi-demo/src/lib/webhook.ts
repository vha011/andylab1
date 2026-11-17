import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { getMode, getWebhookCredentials, type WebhookCredentials } from "./config";
import { parseRecords } from "./momo/parse";
import { mockResult } from "./momo/mock";
import type { WebhookEvent } from "./types";

const MAX_SKEW_MS = 5 * 60_000;
const NONCE_TTL_MS = 10 * 60_000;
const MAX_EVENTS = 50;

export interface NonceStore {
  /** true nếu nonce chưa dùng và đã được ghi nhận. */
  claim(key: string, ttlMs: number): boolean;
}

export function createNonceStore(now: () => number = Date.now): NonceStore {
  const seen = new Map<string, number>();
  return {
    claim(key, ttlMs) {
      const t = now();
      for (const [k, exp] of seen) if (exp <= t) seen.delete(k);
      if (seen.has(key)) return false;
      seen.set(key, t + ttlMs);
      return true;
    },
  };
}

/** Chuỗi ký theo tài liệu MoMo: clientId|apiKey|timestamp|nonce. Body không tham gia ký. */
export function sign(cred: WebhookCredentials, timestamp: string, nonce: string): string {
  return createHmac("sha256", cred.secretKey).update(`${cred.clientId}|${cred.apiKey}|${timestamp}|${nonce}`, "utf8").digest("hex");
}

export type VerifyResult = { ok: true } | { ok: false; reason: "missing_headers" | "stale_timestamp" | "bad_signature" | "replayed_nonce" };

// Tài liệu ghi lúc `timestamp`, lúc `X-Timestamp`: chấp nhận cả hai.
const header = (h: Headers, name: string) => h.get(name) ?? h.get(`x-${name}`);

export function verifyWebhook(headers: Headers, cred: WebhookCredentials, nonces: NonceStore, nowMs: number = Date.now()): VerifyResult {
  const timestamp = header(headers, "timestamp");
  const nonce = header(headers, "nonce");
  const signature = header(headers, "signature");
  if (!timestamp || !nonce || !signature) return { ok: false, reason: "missing_headers" };
  if (!/^\d{10,16}$/.test(timestamp) || Math.abs(nowMs - Number(timestamp)) > MAX_SKEW_MS) return { ok: false, reason: "stale_timestamp" };
  if (!/^[0-9a-f]{64}$/.test(signature)) return { ok: false, reason: "bad_signature" };

  // Kiểm chữ ký trước khi ghi nonce để request giả không làm "cháy" nonce hợp lệ.
  const expected = Buffer.from(sign(cred, timestamp, nonce), "hex");
  if (!timingSafeEqual(expected, Buffer.from(signature, "hex"))) return { ok: false, reason: "bad_signature" };
  if (!nonces.claim(`${cred.clientId}:${nonce}`, NONCE_TTL_MS)) return { ok: false, reason: "replayed_nonce" };
  return { ok: true };
}

export function parseWebhookPayload(payload: unknown, receivedAt: string, id: string): WebhookEvent | null {
  const cd = (payload as { callbackData?: Record<string, unknown> } | null)?.callbackData;
  if (!cd || typeof cd !== "object") return null;
  const vehicle = (cd.vehicleData ?? {}) as Record<string, unknown>;
  const customer = (cd.customerData ?? {}) as Record<string, unknown>;
  const s = (v: unknown) => (typeof v === "string" ? v : "");
  const n = (v: unknown) => (typeof v === "number" ? v : 0);
  let records;
  try {
    records = parseRecords(cd.criminalRecords);
  } catch {
    return null;
  }
  return {
    id,
    receivedAt,
    notifyType: n(cd.notifyType),
    fineStatus: n(cd.fineStatus),
    refreshDate: s(cd.refreshDate),
    customerIdentifier: s(customer.customerIdentifier),
    plate: s(vehicle.vehicleIdentity),
    records,
  };
}

interface Store {
  events: WebhookEvent[];
  nonces: NonceStore;
}
const g = globalThis as unknown as { __phatNguoiStore?: Store };
/** Singleton trên globalThis để sống qua HMR. Chỉ để demo: restart hoặc serverless sẽ mất dữ liệu. */
export function store(): Store {
  return (g.__phatNguoiStore ??= { events: [], nonces: createNonceStore() });
}

export async function receiveWebhook(req: Request, s: Store = store()): Promise<Response> {
  const cred = getWebhookCredentials();
  if (!cred) return json({ ok: false }, 503);

  const verdict = verifyWebhook(req.headers, cred, s.nonces);
  if (!verdict.ok) return json({ ok: false, error: verdict.reason }, 401);

  let payload: unknown;
  try {
    payload = JSON.parse(await req.text());
  } catch {
    return json({ ok: false, error: "invalid_json" }, 400);
  }
  const event = parseWebhookPayload(payload, new Date().toISOString(), randomBytes(6).toString("hex"));
  if (!event) return json({ ok: false, error: "invalid_payload" }, 400);

  s.events.unshift(event);
  s.events.length = Math.min(s.events.length, MAX_EVENTS);
  return json({ ok: true }, 200);
}

/** Dựng và gửi một callback có ký đúng chuẩn vào chính receiveWebhook. Chỉ dùng ở mock. */
export async function simulateWebhook(plate: string, vehicleType: number, phone: string): Promise<Response> {
  if (getMode() !== "mock") return json({ ok: false }, 404);
  const cred = getWebhookCredentials();
  if (!cred) return json({ ok: false }, 503);

  // Lookup lỗi thì không có thông báo thật nào để phát: không được đổi lỗi thành callback "không có lỗi vi phạm".
  let result;
  try {
    result = mockResult(plate, vehicleType);
  } catch {
    return json({ ok: false, error: "lookup_failed" }, 409);
  }
  if (result.hasCriminal === 2) return json({ ok: false, error: "lookup_failed" }, 409);
  const pending = result.records.filter((r) => r.status === "Chưa xử phạt");
  const body = {
    callbackData: {
      notifyType: pending.length > 0 ? 3 : 2,
      fineStatus: pending.length > 0 ? 1 : 0,
      refreshDate: new Date().toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }),
      criminalRecords: pending.map((r) => ({
        customerRecordPlatenumber: r.plate,
        crimeRecordContent: r.content,
        crimeRecordStatus: r.status,
        crimeRecordTime: r.time,
        crimeRecordPIC: r.detectedBy,
        crimeRecordLocation: r.location,
        crimeRecordAgency: r.handlingAgency,
        crimeRecordAddressPIC: r.agencyAddress,
        crimeRecordContact: r.contact,
        violationPenalties: r.penalties,
      })),
      customerData: { customerIdentifier: phone },
      vehicleData: { vehicleIdentity: plate, vehiclePlateColor: "WHITE", vehicleType },
    },
  };
  const timestamp = String(Date.now());
  const nonce = randomBytes(16).toString("hex");
  return receiveWebhook(
    new Request("http://internal/api/webhooks/momo", {
      method: "POST",
      headers: { "content-type": "application/json", timestamp, nonce, signature: sign(cred, timestamp, nonce) },
      body: JSON.stringify(body),
    }),
  );
}

function json(body: unknown, status: number): Response {
  return Response.json(body, { status });
}
