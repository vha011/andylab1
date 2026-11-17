import { getMode } from "@/lib/config";
import { DemoApp } from "./demo-app";

export const dynamic = "force-dynamic";

export default function Page() {
  return <DemoApp mode={getMode()} />;
}
