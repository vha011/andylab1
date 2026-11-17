import { ProviderError } from "../errors";
import type { CriminalRecord, HasCriminal, ViolationResult } from "../types";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ""): string => (typeof v === "string" ? v : fallback);

/** Chuyển một bản ghi từ API tra cứu hoặc webhook (cùng tên trường) sang kiểu nội bộ. */
export function parseRecord(raw: unknown): CriminalRecord | null {
  if (!isObj(raw)) return null;
  const penalties = Array.isArray(raw.violationPenalties) ? raw.violationPenalties.filter((p): p is string => typeof p === "string") : [];
  return {
    plate: str(raw.customerRecordPlatenumber),
    content: str(raw.crimeRecordContent),
    status: str(raw.crimeRecordStatus, "Lỗi tra cứu"),
    time: str(raw.crimeRecordTime),
    detectedBy: str(raw.crimeRecordPIC),
    location: str(raw.crimeRecordLocation),
    handlingAgency: str(raw.crimeRecordAgency),
    agencyAddress: str(raw.crimeRecordAddressPIC),
    contact: str(raw.crimeRecordContact),
    penalties,
  };
}

export function parseRecords(raw: unknown): CriminalRecord[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new ProviderError("UNKNOWN_ERROR");
  return raw.map((r) => {
    const rec = parseRecord(r);
    if (!rec) throw new ProviderError("UNKNOWN_ERROR");
    return rec;
  });
}

/** Phân tích phản hồi userCheckViolation. Ném ProviderError nếu là lỗi hoặc sai định dạng. */
export function parseCheckViolationResponse(httpStatus: number, body: unknown): ViolationResult {
  if (!isObj(body)) throw new ProviderError("UNKNOWN_ERROR");
  const err = body.error;
  if (httpStatus === 401 || body.statusCode === 401) throw new ProviderError("Unauthorized");
  if (typeof err === "string" && err) throw new ProviderError(err);
  if (httpStatus < 200 || httpStatus >= 300) throw new ProviderError("UNKNOWN_ERROR");

  const data = body.data;
  if (!isObj(data)) throw new ProviderError("UNKNOWN_ERROR");
  const hc = data.hasCriminal;
  const hasCriminal: HasCriminal = hc === 0 || hc === 1 || hc === 2 ? hc : 2;
  return {
    plate: str(data.vehicleIdentity),
    plateColor: str(data.vehiclePlateColor),
    vehicleType: typeof data.vehicleType === "number" ? data.vehicleType : 0,
    hasCriminal,
    records: parseRecords(data.criminalRecords),
  };
}
