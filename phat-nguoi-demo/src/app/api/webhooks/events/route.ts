import { getMode } from "@/lib/config";
import { isValidPlate, isVehicleType, normalizePlate } from "@/lib/plate";
import { simulateWebhook, store } from "@/lib/webhook";

export const dynamic = "force-dynamic";

// Cả hai handler chỉ tồn tại ở mock: ở live, dữ liệu callback là dữ liệu khách hàng thật, không được lộ công khai.
export function GET(): Response {
  if (getMode() !== "mock") return new Response(null, { status: 404 });
  return Response.json({ events: store().events }, { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request): Promise<Response> {
  if (getMode() !== "mock") return new Response(null, { status: 404 });
  const parsed: unknown = await req.json().catch(() => null);
  if (typeof parsed !== "object" || parsed === null) return Response.json({ ok: false }, { status: 400 });
  const body = parsed as { plate?: unknown; vehicleType?: unknown; phone?: unknown };
  const plate = typeof body.plate === "string" ? normalizePlate(body.plate) : "";
  if (!isValidPlate(plate) || !isVehicleType(body.vehicleType)) return Response.json({ ok: false }, { status: 400 });
  const phone = typeof body.phone === "string" && /^0\d{9}$/.test(body.phone) ? body.phone : "0900000000";
  return simulateWebhook(plate, body.vehicleType, phone);
}
