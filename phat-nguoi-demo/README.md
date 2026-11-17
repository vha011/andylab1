# Tra cứu phạt nguội (demo)

Web app demo: nhập biển số xe, kiểm tra phạt nguội qua API đối tác MoMo, và nhận thông báo định kỳ qua webhook. Next.js 16 (App Router), TypeScript, không có dịch vụ ngoài nào ngoài API MoMo.

## Chạy thử

```bash
pnpm install
pnpm dev            # http://localhost:3000, mặc định chế độ mock
pnpm check          # typecheck + test
```

Chế độ mặc định là `mock`: dữ liệu mô phỏng theo đúng cấu trúc tài liệu MoMo, không gọi mạng, giao diện luôn hiện banner "Dữ liệu mô phỏng". Biển mẫu để thử từng trạng thái nằm ngay dưới ô nhập:

| Biển | Kết quả |
| --- | --- |
| 30A-848.12 | 2 lỗi chưa xử phạt |
| 76A-032.85 | chỉ có lỗi đã xử phạt (`hasCriminal = 0` nhưng vẫn có bản ghi) |
| 51F-123.45 | không có vi phạm |
| 88A-000.00 | nguồn trả `hasCriminal = 2` (lỗi tra cứu, không phải "sạch") |
| 99X-999.99 | `EXTERNAL_OUT_OF_WORKING_HOUR` |

Biển khác ra kết quả ổn định theo hash của biển.

## Chuyển sang dữ liệu thật

Sao chép `.env.example` thành `.env.local`, đặt `MOMO_MODE=live` và điền `MOMO_BASE_URL`, `MOMO_API_KEY`. Key chỉ nằm phía server, trình duyệt chỉ gọi `/api/lookup`.

**Cần xác nhận với MoMo trước khi chạy live**, vì tài liệu công khai không nêu:
- Base URL sandbox và production (trang hướng dẫn API key chỉ nêu một URL ví dụ, không nói rõ môi trường).
- Tên header chứa API key. Code dùng `x-api-key` theo mặc định, đổi bằng `MOMO_API_KEY_HEADER`.
- Mã `plateColor` và `vehicleType` ngoài ba loại đã ghi (1 ô tô, 30 xe máy, 40 xe máy điện).

Chưa có khóa thật nên **đường live chưa được chạy với MoMo thật**. Nó được test bằng `fetch` giả đúng theo mẫu response trong tài liệu.

## Cấu trúc

| Phần | File |
| --- | --- |
| API tra cứu (kiểm biển, giới hạn 8 lượt/phút/IP, ẩn lỗi nội bộ) | `src/app/api/lookup/route.ts` |
| Client MoMo thật / mock / parse response | `src/lib/momo/` |
| Webhook: xác thực chữ ký, chống replay, lưu sự kiện | `src/lib/webhook.ts`, `src/app/api/webhooks/momo/route.ts` |
| Ánh xạ mã lỗi MoMo sang thông báo tiếng Việt | `src/lib/errors.ts` |
| Kết luận "có/không vi phạm" từ trạng thái từng bản ghi | `src/lib/summary.ts` |

## Webhook

`POST /api/webhooks/momo` xác thực theo tài liệu callback của MoMo: header `timestamp`, `nonce`, `signature`; chữ ký là HMAC-SHA256 hex của `clientId|apiKey|timestamp|nonce` (body không tham gia ký). Từ chối khi lệch giờ quá 5 phút hoặc nonce đã dùng trong 10 phút. Trả 200 khi thành công, 401 khi xác thực lỗi (MoMo sẽ retry), 400 khi body hỏng.

Giới hạn của bản demo:
- Sự kiện và nonce lưu **trong bộ nhớ** tiến trình. Khởi động lại là mất, và nhiều instance hay serverless sẽ không dùng chung. Production cần Redis hoặc DB (nonce dùng `SET NX EX`).
- Ở chế độ mock có bộ khóa demo công khai và nút "Mô phỏng MoMo gửi thông báo" để chạy trọn luồng. Ở `live`, endpoint từ chối mọi request nếu chưa cấu hình `MOMO_WEBHOOK_*`, và API xem danh sách sự kiện bị tắt (trả 404) vì đó là dữ liệu khách hàng thật.
- Chưa làm luồng **đăng ký dịch vụ** (`userCreateAutoNoty`): theo tài liệu, người dùng phải thanh toán trước rồi mới gọi API, nên cần tích hợp thanh toán và danh sách gói (`Product/user/getList`) trước.

## Lưu ý dữ liệu

Biển số và vi phạm là dữ liệu cá nhân. App không lưu kết quả tra cứu và chỉ ghi log mã lỗi, không ghi biển số. Kết quả mang tính tham khảo.
