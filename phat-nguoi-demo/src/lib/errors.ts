export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number = 502,
  ) {
    super(code);
    this.name = "ProviderError";
  }
}

interface ErrorInfo {
  message: string;
  retryable: boolean;
  httpStatus: number;
}

// Mã lỗi theo tài liệu API tra cứu phạt nguội của MoMo. Không lộ chi tiết nội bộ ra client.
const ERRORS: Record<string, ErrorInfo> = {
  INVALID_PLATE_NUMBER: { message: "Biển số xe không hợp lệ. Kiểm tra lại biển số và loại xe.", retryable: false, httpStatus: 400 },
  RETRY_AGAIN_LATER: { message: "Hệ thống đang bận, vui lòng thử lại sau ít phút.", retryable: true, httpStatus: 503 },
  EXTERNAL_RATE_LIMITED_EXCEEDED: { message: "Nguồn dữ liệu đang giới hạn tốc độ, vui lòng thử lại sau.", retryable: true, httpStatus: 503 },
  EXTERNAL_OUT_OF_WORKING_HOUR: { message: "Nguồn dữ liệu của cơ quan chức năng đang ngoài giờ làm việc. Hãy thử lại vào giờ hành chính.", retryable: true, httpStatus: 503 },
  EXTERNAL_API_ERROR: { message: "Nguồn dữ liệu của cơ quan chức năng đang gặp lỗi, vui lòng thử lại sau.", retryable: true, httpStatus: 502 },
  EXTERNAL_QUOTA_EXCEEDED: { message: "Dịch vụ tạm thời hết lượt tra cứu. Vui lòng quay lại sau.", retryable: false, httpStatus: 503 },
  QUOTA_EXCEEDED: { message: "Dịch vụ tạm thời hết lượt tra cứu. Vui lòng quay lại sau.", retryable: false, httpStatus: 503 },
  Unauthorized: { message: "Dịch vụ chưa được cấu hình xác thực đúng. Liên hệ quản trị viên.", retryable: false, httpStatus: 502 },
  NOT_CONFIGURED: { message: "Dịch vụ chưa được cấu hình. Liên hệ quản trị viên.", retryable: false, httpStatus: 500 },
  RATE_LIMITED: { message: "Bạn tra cứu quá nhanh, vui lòng đợi một chút rồi thử lại.", retryable: true, httpStatus: 429 },
  TIMEOUT: { message: "Nguồn dữ liệu phản hồi quá lâu, vui lòng thử lại.", retryable: true, httpStatus: 504 },
};

const UNKNOWN: ErrorInfo = { message: "Không tra cứu được lúc này, vui lòng thử lại sau.", retryable: true, httpStatus: 502 };

export function describeError(code: string): { code: string; message: string; retryable: boolean; httpStatus: number } {
  const info = ERRORS[code] ?? UNKNOWN;
  return { code: ERRORS[code] ? code : "UNKNOWN_ERROR", ...info };
}
