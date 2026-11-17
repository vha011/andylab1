/** Giới hạn tần suất theo khóa (IP) bằng cửa sổ trượt, lưu trong bộ nhớ tiến trình. Production nhiều instance cần Redis. */
export function createRateLimiter(limit: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return {
    allow(key: string): boolean {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return false;
      }
      recent.push(t);
      hits.set(key, recent);
      if (hits.size > 5000) for (const [k, v] of hits) if (v.every((x) => t - x >= windowMs)) hits.delete(k);
      return true;
    },
  };
}

/**
 * IP khách theo số proxy tin cậy phía trước app (TRUSTED_PROXY_HOPS, mặc định 1).
 * Mỗi proxy tin cậy nối thêm IP vào cuối x-forwarded-for, nên lấy mục thứ `hops` tính từ cuối;
 * phần client tự chèn nằm bên trái và bị bỏ qua. Không đọc x-real-ip vì client giả mạo được.
 * Thiếu header thì gom chung một nhóm "unknown": giới hạn chặt hơn chứ không để lọt.
 */
export function clientIp(headers: Headers, hops: number = Number(process.env.TRUSTED_PROXY_HOPS ?? 1) || 1): string {
  const chain = (headers.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return chain[chain.length - hops] ?? "unknown";
}
