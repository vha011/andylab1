import { clientIp, createRateLimiter } from "@/lib/rate-limit";
import { describeError, ProviderError } from "@/lib/errors";
import { getProvider } from "@/lib/config";
import { isValidPlate, isVehicleType, normalizePlate } from "@/lib/plate";
import type { LookupResponse } from "@/lib/types";

// Mỗi lượt tra cứu live tốn quota của MoMo nên giới hạn theo IP, kèm trần chung để IP giả mạo cũng không đốt hết quota.
const limiter = createRateLimiter(8, 60_000);
const globalLimiter = createRateLimiter(120, 60_000);

function fail(code: string, status?: number): Response {
  const e = describeError(code);
  const body: LookupResponse = { ok: false, error: { code: e.code, message: e.message, retryable: e.retryable } };
  return Response.json(body, { status: status ?? e.httpStatus, headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request): Promise<Response> {
  if (!limiter.allow(clientIp(req.headers)) || !globalLimiter.allow("*")) return fail("RATE_LIMITED");

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return fail("INVALID_PLATE_NUMBER", 400);
  }
  if (typeof parsed !== "object" || parsed === null) return fail("INVALID_PLATE_NUMBER", 400);
  const input = parsed as { plate?: unknown; vehicleType?: unknown };
  const plate = typeof input.plate === "string" ? normalizePlate(input.plate) : "";
  if (!isValidPlate(plate) || !isVehicleType(input.vehicleType)) return fail("INVALID_PLATE_NUMBER", 400);

  try {
    const provider = getProvider();
    const result = await provider.check({ plate, vehicleType: input.vehicleType });
    const body: LookupResponse = { ok: true, source: provider.source, result };
    return Response.json(body, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    const code = e instanceof ProviderError ? e.code : "UNKNOWN_ERROR";
    if (!(e instanceof ProviderError)) console.error("lookup failed", e instanceof Error ? e.name : "unknown");
    return fail(code);
  }
}
