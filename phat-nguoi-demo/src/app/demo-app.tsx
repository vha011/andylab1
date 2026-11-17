"use client";

import { useState } from "react";
import { LookupPanel } from "./lookup-panel";
import { WebhookPanel } from "./webhook-panel";

export function DemoApp({ mode }: { mode: "mock" | "live" }) {
  const [plate, setPlate] = useState("");
  const [vehicleType, setVehicleType] = useState<1 | 30 | 40>(1);

  return (
    <main className="shell">
      <header className="hero">
        <h1>Tra cứu phạt nguội</h1>
        <p>Nhập biển số xe để kiểm tra vi phạm giao thông được ghi nhận qua camera.</p>
      </header>

      {mode === "mock" && (
        <div className="banner banner-demo" role="note">
          <strong>Dữ liệu mô phỏng.</strong> Chưa kết nối API tra cứu thật, kết quả bên dưới không phải dữ liệu thật của biển số bạn nhập.
        </div>
      )}

      <LookupPanel mode={mode} plate={plate} onPlate={setPlate} vehicleType={vehicleType} onVehicleType={setVehicleType} />
      {mode === "mock" && <WebhookPanel plate={plate} vehicleType={vehicleType} />}

      <footer className="foot">Kết quả mang tính tham khảo. Hãy đối chiếu với cơ quan chức năng trước khi nộp phạt.</footer>
    </main>
  );
}
