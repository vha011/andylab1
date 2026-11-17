"use client";

import { useCallback, useEffect, useState } from "react";
import { formatViolationTime } from "@/lib/format";
import { formatPlate, isValidPlate, normalizePlate } from "@/lib/plate";
import { NOTIFY_TYPE_LABEL } from "@/lib/summary";
import type { WebhookEvent } from "@/lib/types";

export function WebhookPanel({ plate, vehicleType }: { plate: string; vehicleType: number }) {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/webhooks/events", { cache: "no-store" });
    if (res.ok) setEvents(((await res.json()) as { events: WebhookEvent[] }).events);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const n = normalizePlate(plate);
  const ok = isValidPlate(n);

  async function simulate() {
    setBusy(true);
    setNote("");
    try {
      const res = await fetch("/api/webhooks/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plate: n, vehicleType }) });
      setNote(
        res.ok
          ? "Đã nhận callback và xác thực chữ ký thành công."
          : res.status === 409
            ? "Biển này đang mô phỏng lỗi tra cứu nên không có thông báo nào được gửi."
            : `Callback bị từ chối (HTTP ${res.status}).`,
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="wh-title">
      <h2 id="wh-title">Thông báo định kỳ (webhook)</h2>
      <p className="muted">
        Sau khi người dùng đăng ký dịch vụ, nguồn dữ liệu gọi <code>POST /api/webhooks/phat-nguoi</code> mỗi khi có thay đổi. Server kiểm chữ ký HMAC-SHA256, giới hạn lệch giờ 5 phút và chặn dùng lại nonce.
      </p>
      <div className="row">
        <button className="btn btn-secondary" type="button" onClick={() => void simulate()} disabled={!ok || busy}>
          {busy ? "Đang gửi…" : ok ? `Mô phỏng nguồn dữ liệu gửi thông báo cho ${formatPlate(n)}` : "Nhập biển số hợp lệ để mô phỏng"}
        </button>
        <button className="link" type="button" onClick={() => void refresh()}>
          Làm mới
        </button>
      </div>
      <p className="hint" aria-live="polite">{note}</p>

      {events.length === 0 ? (
        <p className="muted">Chưa nhận thông báo nào.</p>
      ) : (
        <ul className="events">
          {events.map((e) => (
            <li key={e.id} className="event">
              <div className="event-head">
                <b>{formatPlate(e.plate)}</b>
                <span className={`badge ${e.fineStatus === 1 ? "badge-pending" : "badge-done"}`}>{NOTIFY_TYPE_LABEL[e.notifyType] ?? `Loại ${e.notifyType}`}</span>
              </div>
              <div className="sub">
                Nhận lúc {formatViolationTime(e.receivedAt)} · gửi tới {e.customerIdentifier || "—"} · {e.records.length} lỗi mới
              </div>
              {e.records.map((r, i) => (
                <div key={i} className="sub">• {r.content}</div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
