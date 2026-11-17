/** Kiểu theo tài liệu API userCheckViolation và callback CustomerCriminalRecord của bên cung cấp API. */

export type RecordStatus = "Chưa xử phạt" | "Đã xử phạt" | "Không vi phạm" | "Lỗi tra cứu" | string;

export interface CriminalRecord {
  plate: string;
  content: string;
  status: RecordStatus;
  /** ISO UTC hoặc "yyyy-MM-dd HH:mm:ss" (giờ VN), xem formatViolationTime. */
  time: string;
  detectedBy: string;
  location: string;
  handlingAgency: string;
  agencyAddress: string;
  contact: string;
  penalties: string[];
}

/** 0 = không có vi phạm, 1 = có, 2 = lỗi hệ thống/không xác định. */
export type HasCriminal = 0 | 1 | 2;

export interface ViolationResult {
  plate: string;
  plateColor: string;
  vehicleType: number;
  hasCriminal: HasCriminal;
  records: CriminalRecord[];
}

export interface LookupInput {
  plate: string;
  vehicleType: number;
}

export interface ViolationProvider {
  readonly source: "mock" | "live";
  check(input: LookupInput): Promise<ViolationResult>;
}

export type LookupResponse =
  | { ok: true; source: "mock" | "live"; result: ViolationResult }
  | { ok: false; error: { code: string; message: string; retryable: boolean } };

export interface WebhookEvent {
  id: string;
  receivedAt: string;
  notifyType: number;
  fineStatus: number;
  refreshDate: string;
  customerIdentifier: string;
  plate: string;
  records: CriminalRecord[];
}
