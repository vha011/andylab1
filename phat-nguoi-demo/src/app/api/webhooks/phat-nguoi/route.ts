import { receiveWebhook } from "@/lib/webhook";

export const dynamic = "force-dynamic";

export function POST(req: Request): Promise<Response> {
  return receiveWebhook(req);
}
