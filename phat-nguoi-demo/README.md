# Tra cứu phạt nguội (demo)

Web app demo: nhập biển số xe, kiểm tra phạt nguội qua API của bên cung cấp dịch vụ, và nhận thông báo định kỳ qua webhook. Next.js 16 (App Router), TypeScript, không có dịch vụ ngoài nào ngoài API tra cứu đó.

## Chạy thử

```bash
pnpm install
pnpm dev            # http://localhost:3000, mặc định chế độ mock
pnpm check          # typecheck + test
```

Chế độ mặc định là `mock`: dữ liệu mô phỏng theo đúng cấu trúc tài liệu API, không gọi mạng, giao diện luôn hiện banner "Dữ liệu mô phỏng". Biển mẫu để thử từng trạng thái nằm ngay dưới ô nhập:

| Biển | Kết quả |
| --- | --- |
| 30A-848.12 | 2 lỗi chưa xử phạt |
| 76A-032.85 | chỉ có lỗi đã xử phạt (`hasCriminal = 0` nhưng vẫn có bản ghi) |
| 51F-123.45 | không có vi phạm |
| 88A-000.00 | nguồn trả `hasCriminal = 2` (lỗi tra cứu, không phải "sạch") |
| 99X-999.99 | `EXTERNAL_OUT_OF_WORKING_HOUR` |

Biển khác ra kết quả ổn định theo hash của biển.

## Chuyển sang dữ liệu thật

Sao chép `.env.example` thành `.env.local`, đặt `PHATNGUOI_MODE=live` và điền `PHATNGUOI_BASE_URL`, `PHATNGUOI_API_KEY`. Key chỉ nằm phía server, trình duyệt chỉ gọi `/api/lookup`.

**Cần xác nhận với bên cung cấp API trước khi chạy live**, vì tài liệu công khai không nêu:
- Base URL sandbox và production (trang hướng dẫn API key chỉ nêu một URL ví dụ, không nói rõ môi trường).
- Tên header chứa API key. Code dùng `x-api-key` theo mặc định, đổi bằng `PHATNGUOI_API_KEY_HEADER`.
- Mã `plateColor` và `vehicleType` ngoài ba loại đã ghi (1 ô tô, 30 xe máy, 40 xe máy điện).

Chưa có khóa thật nên **đường live chưa được chạy với API thật**. Nó được test bằng `fetch` giả đúng theo mẫu response trong tài liệu.

## Cấu trúc

| Phần | File |
| --- | --- |
| API tra cứu (kiểm biển, giới hạn 8 lượt/phút/IP, ẩn lỗi nội bộ) | `src/app/api/lookup/route.ts` |
| Client API thật / mock / parse response | `src/lib/upstream/` |
| Webhook: xác thực chữ ký, chống replay, lưu sự kiện | `src/lib/webhook.ts`, `src/app/api/webhooks/phat-nguoi/route.ts` |
| Ánh xạ mã lỗi của API sang thông báo tiếng Việt | `src/lib/errors.ts` |
| Kết luận "có/không vi phạm" từ trạng thái từng bản ghi | `src/lib/summary.ts` |

## Webhook

`POST /api/webhooks/phat-nguoi` xác thực theo tài liệu callback của bên cung cấp API: header `timestamp`, `nonce`, `signature`; chữ ký là HMAC-SHA256 hex của `clientId|apiKey|timestamp|nonce` (body không tham gia ký). Từ chối khi lệch giờ quá 5 phút hoặc nonce đã dùng trong 10 phút. Trả 200 khi thành công, 401 khi xác thực lỗi (bên gửi sẽ retry), 400 khi body hỏng.

Giới hạn của bản demo:
- Sự kiện và nonce lưu **trong bộ nhớ** tiến trình. Khởi động lại là mất, và nhiều instance hay serverless sẽ không dùng chung. Production cần Redis hoặc DB (nonce dùng `SET NX EX`).
- Ở chế độ mock có bộ khóa demo công khai và nút "Mô phỏng nguồn dữ liệu gửi thông báo" để chạy trọn luồng. Ở `live`, endpoint từ chối mọi request nếu chưa cấu hình `PHATNGUOI_WEBHOOK_*`, và API xem danh sách sự kiện bị tắt (trả 404) vì đó là dữ liệu khách hàng thật.
- Chưa làm luồng **đăng ký dịch vụ** (`userCreateAutoNoty`): theo tài liệu, người dùng phải thanh toán trước rồi mới gọi API, nên cần tích hợp thanh toán và danh sách gói (`Product/user/getList`) trước.

## Lưu ý dữ liệu

Biển số và vi phạm là dữ liệu cá nhân. App không lưu kết quả tra cứu và chỉ ghi log mã lỗi, không ghi biển số. Kết quả mang tính tham khảo.

## Giới hạn tần suất

Mỗi lượt tra cứu live tốn quota của nguồn dữ liệu nên `/api/lookup` giới hạn 8 lượt/phút/IP và 120 lượt/phút toàn app. IP lấy từ `x-forwarded-for` theo `TRUSTED_PROXY_HOPS` (số proxy tin cậy phía trước, mặc định 1); đặt sai số này sẽ làm IP bị giả mạo hoặc mọi người dùng chung một nhóm. Bộ đếm lưu trong bộ nhớ nên nhiều instance cần bộ đếm chung (Redis).

## Hiển thị biển số

Định dạng `30A-848.12` chỉ để hiển thị và là suy đoán theo loại xe đã chọn (xe máy 5 số sau seri hiểu là `59C1-1234`); dữ liệu gửi đi luôn là chuỗi đã chuẩn hóa, không bị ảnh hưởng.
