import { useAppStore } from "@/store/useAppStore";

export function RecordingModesPanel() {
  const mode = useAppStore((s) => s.recordingMode);
  const setMode = useAppStore((s) => s.setRecordingMode);
  const punch = useAppStore((s) => s.punchEnabled);
  const setPunch = useAppStore((s) => s.setPunch);
  const t0 = useAppStore((s) => s.punchT0Us);
  const t1 = useAppStore((s) => s.punchT1Us);
  const latR = useAppStore((s) => s.latencyRecordMs);
  const latP = useAppStore((s) => s.latencyPlayMs);
  const setLat = useAppStore((s) => s.setLatency);
  return (
    <div className="panel">
      <h2 style={{ fontSize: "0.9rem" }}>Recording & latency</h2>
      <label className="row muted">
        <input type="radio" name="rm" checked={mode === "appendEnd"} onChange={() => setMode("appendEnd")} />
        Append at end
      </label>
      <label className="row muted">
        <input type="radio" name="rm" checked={mode === "fromPlayhead"} onChange={() => setMode("fromPlayhead")} />
        From playhead
      </label>
      <label className="row muted" style={{ marginTop: "0.5rem" }}>
        <input type="checkbox" checked={punch} onChange={(e) => setPunch(e.target.checked, t0, t1)} />
        Punch-in window (µs)
      </label>
      <div className="row">
        <input
          type="number"
          value={Math.round(t0)}
          disabled={!punch}
          onChange={(e) => setPunch(true, Number(e.target.value), t1)}
        />
        <span className="muted">—</span>
        <input
          type="number"
          value={Math.round(t1)}
          disabled={!punch}
          onChange={(e) => setPunch(true, t0, Number(e.target.value))}
        />
      </div>
      <div className="row" style={{ marginTop: "0.5rem" }}>
        <label className="muted">
          Latency record (ms)
          <input
            type="number"
            value={latR}
            onChange={(e) => setLat(Number(e.target.value), latP)}
            style={{ width: "4rem" }}
          />
        </label>
        <label className="muted">
          Latency play (ms)
          <input
            type="number"
            value={latP}
            onChange={(e) => setLat(latR, Number(e.target.value))}
            style={{ width: "4rem" }}
          />
        </label>
      </div>
    </div>
  );
}
