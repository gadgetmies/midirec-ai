import { useAppStore, rowKeysFromBlocks, channelHue } from "@/store/useAppStore";
import type { RowKey } from "@/model/types";
import { parseRowKey } from "@/model/types";

export function RoutingPanel() {
  const blocks = useAppStore((s) => s.noteBlocks);
  const outputs = useAppStore((s) => s.outputs);
  const routing = useAppStore((s) => s.rowRouting);
  const setRoute = useAppStore((s) => s.setRowRouting);
  const toggleClockOut = useAppStore((s) => s.toggleClockOut);
  const clockOut = useAppStore((s) => s.clockOutOutputIds);
  const rows = rowKeysFromBlocks(blocks);

  const toggleRowOut = (row: RowKey, id: string) => {
    const cur = routing[row] ?? [];
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
    setRoute(row, next);
  };

  return (
    <div className="panel">
      <h2 style={{ fontSize: "0.9rem" }}>Per-row routing</h2>
      <p className="muted" style={{ fontSize: "0.8rem" }}>
        Choose outputs per note row. Playback uses union of row routes and checked outputs in Devices.
      </p>
      <div style={{ maxHeight: "200px", overflow: "auto" }}>
        {rows.map((rk) => {
          const p = parseRowKey(rk);
          const label = p ? `Ch ${p.channel + 1} note ${p.note}` : rk;
          return (
            <div key={rk} style={{ marginBottom: "0.5rem", borderBottom: "1px solid var(--border)" }}>
              <div className="row" style={{ color: p ? channelHue(p.channel) : undefined }}>
                <strong>{label}</strong>
              </div>
              {outputs.map((o) => (
                <label key={o.id} className="row" style={{ fontSize: "0.85rem" }}>
                  <input
                    type="checkbox"
                    checked={(routing[rk] ?? []).includes(o.id)}
                    onChange={() => toggleRowOut(rk, o.id)}
                  />
                  {o.name || o.id}
                </label>
              ))}
            </div>
          );
        })}
      </div>
      <h2 style={{ fontSize: "0.9rem", marginTop: "0.75rem" }}>Clock out targets</h2>
      {outputs.map((o) => (
        <label key={o.id} className="row" style={{ fontSize: "0.85rem" }}>
          <input type="checkbox" checked={clockOut.includes(o.id)} onChange={() => toggleClockOut(o.id)} />
          {o.name || o.id}
        </label>
      ))}
    </div>
  );
}
