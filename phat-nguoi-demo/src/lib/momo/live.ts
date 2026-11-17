import type { ViolationProvider } from "../types";
import { ProviderError } from "../errors";
import { parseCheckViolationResponse } from "./parse";

const PATH = "/PartnerAPI/CustomerCriminalRecord/user/userCheckViolation";
const TIMEOUT_MS = 15_000;

export interface LiveConfig {
  baseUrl: string;
  apiKey: string;
  apiKeyHeader: string;
}

export function createLiveProvider(cfg: LiveConfig, fetchImpl: typeof fetch = fetch): ViolationProvider {
  return {
    source: "live",
    async check({ plate, vehicleType }) {
      let res: Response;
      try {
        res = await fetchImpl(new URL(PATH, cfg.baseUrl), {
          method: "POST",
          headers: { "content-type": "application/json", accept: "application/json", [cfg.apiKeyHeader]: cfg.apiKey },
          body: JSON.stringify({ licensePlates: plate, vehicleType }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
          cache: "no-store",
        });
      } catch (e) {
        if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new ProviderError("TIMEOUT", 504);
        throw new ProviderError("EXTERNAL_API_ERROR");
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch {
        throw new ProviderError("UNKNOWN_ERROR");
      }
      return parseCheckViolationResponse(res.status, body);
    },
  };
}
