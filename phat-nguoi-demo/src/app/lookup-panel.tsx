"use client";

import { useRef, useState } from "react";
import { DEMO_PLATES } from "@/lib/demo-plates";
import { cleanViolationContent, formatViolationTime } from "@/lib/format";
import { formatPlate, isValidPlate, normalizePlate, VEHICLE_TYPE_LABEL } from "@/lib/plate";
import { summarize } from "@/lib/summary";
import type { CriminalRecord, LookupResponse, ViolationResult } from "@/lib/types";

type VT = 1 | 30 | 40;
type State = { kind: "idle" } | { kind: "loading" } | { kind: "done"; result: ViolationResult } | { kind: "error"; message: string; retryable: boolean };

interface Props {
  mode: "mock" | "live";
  plate: string;
  onPlate: (v: string) => void;
  vehicleType: VT;
  onVehicleType: (v: VT) => void;
}

export function LookupPanel({ mode, plate, onPlate, vehicleType, onVehicleType }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [touched, setTouched] = useState(false);
  const seq = useRef(0);

  const normalized = normalizePlate(plate);
  const valid = isValidPlate(normalized);
  const showInvalid = touched && normalized.length > 0 && !valid;

  async function run(p: string, vt: VT) {
    const n = normalizePlate(p);
    if (!isValidPlate(n)) {
      setTouched(true);
      return;
    }
    const mine = ++seq.current;
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/lookup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plate: n, vehicleType: vt }) });
      const body = (await res.json()) as LookupResponse;
      if (mine !== seq.current) return;
      setState(body.ok ? { kind: "done", result: body.result } : { kind: "error", message: body.error.message, retryable: body.error.retryable });
    } catch {
      if (mine !== seq.current) return;
      setState({ kind: "error", message: "Không kết nối được tới máy chủ. Kiểm tra mạng và thử lại.", retryable: true });
    }
  }

  return (
    <section className="card" aria-labelledby="lookup-title">
      <h2 id="lookup-title" className="sr-only">Tra cứu</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(plate, vehicleType);
        }}
        noValidate
      >
        <label htmlFor="plate" className="label">Biển số xe</label>
        <div className="plate-wrap">
          <input
            id="plate"
            className={`plate-input${showInvalid ? " invalid" : ""}`}
            value={plate}
            onChange={(e) => onPlate(e.target.value.toUpperCase())}
            onBlur={() => setTouched(true)}
            placeholder="30A-848.12"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={16}
            aria-invalid={showInvalid}
            aria-describedby="plate-hint"
          />
        </div>
        <p id="plate-hint" className={`hint${showInvalid ? " hint-error" : ""}`}>
          {showInvalid
            ? "Biển số chưa đúng định dạng. Ví dụ: 30A-848.12, 51F-123.45, 59C1-123.45."
            : valid
              ? `Sẽ tra cứu: ${formatPlate(normalized, vehicleType)}`
              : "Có thể nhập có hoặc không có dấu gạch, dấu chấm, dấu cách."}
        </p>

        <fieldset className="segmented">
          <legend className="label">Loại xe</legend>
          {([1, 30, 40] as const).map((v) => (
            <label key={v} className={vehicleType === v ? "seg active" : "seg"}>
              <input type="radio" name="vt" value={v} checked={vehicleType === v} onChange={() => onVehicleType(v)} />
              {VEHICLE_TYPE_LABEL[v]}
            </label>
          ))}
        </fieldset>

        <button className="btn" type="submit" disabled={state.kind === "loading" || !valid}>
          {state.kind === "loading" ? "Đang tra cứu…" : "Tra cứu phạt nguội"}
        </button>
      </form>

      {mode === "mock" && (
        <div className="chips" aria-label="Biển mẫu">
          <span className="chips-title">Thử nhanh:</span>
          {DEMO_PLATES.map((d) => (
            <button
              key={d.plate}
              type="button"
              className="chip"
              onClick={() => {
                onPlate(d.plate);
                onVehicleType(1);
                setTouched(true);
                void run(d.plate, 1);
              }}
            >
              <b>{formatPlate(d.plate)}</b> <span>{d.note}</span>
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite" className="result-region">
        {state.kind === "loading" && <p className="muted">Đang truy vấn dữ liệu…</p>}
        {state.kind === "error" && (
          <div className="banner banner-error" role="alert">
            {state.message}
            {state.retryable && (
              <button type="button" className="link" onClick={() => void run(plate, vehicleType)}>
                Thử lại
              </button>
            )}
          </div>
        )}
        {state.kind === "done" && <Result result={state.result} />}
      </div>
    </section>
  );
}

function Result({ result }: { result: ViolationResult }) {
  const s = summarize(result);
  const title = formatPlate(normalizePlate(result.plate), result.vehicleType);

  if (s.kind === "error") {
    return (
      <div className="banner banner-error" role="alert">
        <strong>{title}:</strong> nguồn dữ liệu không trả được kết quả cho biển này. Đây không có nghĩa là xe không vi phạm, hãy thử lại sau.
      </div>
    );
  }

  const count = s.pending || result.records.length;
  const headline =
    s.kind === "pending"
      ? count > 0
        ? `Có ${count} vi phạm chưa xử phạt`
        : "Có vi phạm chưa xử phạt"
      : s.kind === "history"
        ? "Không còn lỗi chưa xử phạt"
        : "Không phát hiện vi phạm";
  const sub =
    s.kind === "history"
      ? `Có ${s.handled} lỗi cũ đã xử phạt trong dữ liệu.`
      : s.kind === "clear"
        ? "Chưa ghi nhận lỗi phạt nguội cho biển số này."
        : "Xem chi tiết bên dưới và liên hệ đơn vị xử lý để nộp phạt.";

  return (
    <div className="result">
      <div className={`summary summary-${s.kind}`}>
        <div className="summary-plate">{title}</div>
        <div>
          <div className="summary-title">{headline}</div>
          <div className="summary-sub">{sub}</div>
        </div>
      </div>
      <ul className="records">
        {result.records.map((r, i) => (
          <RecordCard key={`${r.time}-${i}`} r={r} />
        ))}
      </ul>
    </div>
  );
}

function RecordCard({ r }: { r: CriminalRecord }) {
  const pending = r.status === "Chưa xử phạt";
  return (
    <li className="record">
      <div className="record-head">
        <span className={`badge ${pending ? "badge-pending" : "badge-done"}`}>{r.status}</span>
        <time>{formatViolationTime(r.time)}</time>
      </div>
      <p className="record-content">{cleanViolationContent(r.content)}</p>
      <dl>
        <dt>Địa điểm</dt>
        <dd>{r.location || "—"}</dd>
        <dt>Đơn vị phát hiện</dt>
        <dd>{r.detectedBy || "—"}</dd>
        <dt>Đơn vị xử lý</dt>
        <dd>
          {r.handlingAgency || "—"}
          {r.agencyAddress && <span className="sub"> · {r.agencyAddress}</span>}
          {r.contact && <span className="sub"> · ĐT {r.contact}</span>}
        </dd>
      </dl>
      {r.penalties.length > 0 && (
        <ul className="penalties">
          {r.penalties.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </li>
  );
}
