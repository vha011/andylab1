import { createLiveProvider } from "./momo/live";
import { createMockProvider } from "./momo/mock";
import { ProviderError } from "./errors";
import type { ViolationProvider } from "./types";

export type Mode = "mock" | "live";

export interface WebhookCredentials {
  clientId: string;
  apiKey: string;
  secretKey: string;
}

export function getMode(env: NodeJS.ProcessEnv = process.env): Mode {
  return env.MOMO_MODE === "live" ? "live" : "mock";
}

export function getProvider(env: NodeJS.ProcessEnv = process.env): ViolationProvider {
  if (getMode(env) === "mock") return createMockProvider(Number(env.MOMO_MOCK_DELAY_MS ?? 500) || 0);
  const baseUrl = env.MOMO_BASE_URL?.trim();
  const apiKey = env.MOMO_API_KEY?.trim();
  if (!baseUrl || !apiKey) throw new ProviderError("NOT_CONFIGURED", 500);
  return createLiveProvider({ baseUrl, apiKey, apiKeyHeader: env.MOMO_API_KEY_HEADER?.trim() || "x-api-key" });
}

// Bộ khóa demo công khai, chỉ dùng ở mock để bấm "mô phỏng thông báo" chạy end-to-end.
const DEMO_CREDENTIALS: WebhookCredentials = { clientId: "demo-client", apiKey: "demo-api-key", secretKey: "demo-secret-key" };

/** Trả null nếu chưa cấu hình: webhook phải từ chối, không bao giờ nhận request không ký. */
export function getWebhookCredentials(env: NodeJS.ProcessEnv = process.env): WebhookCredentials | null {
  const clientId = env.MOMO_WEBHOOK_CLIENT_ID?.trim();
  const apiKey = env.MOMO_WEBHOOK_API_KEY?.trim();
  const secretKey = env.MOMO_WEBHOOK_SECRET?.trim();
  if (clientId && apiKey && secretKey) return { clientId, apiKey, secretKey };
  return getMode(env) === "mock" ? DEMO_CREDENTIALS : null;
}
