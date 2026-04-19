import { useMemo, useRef, useEffect } from "react";
import type { CcLane as CcLaneT } from "@/model/types";
import { useAppStore } from "@/store/useAppStore";

function LaneChart({ lane }: { lane: CcLaneT }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const pts = useMemo(() => [...lane.points].sort((a, b) => a.tUs - b.tUs), [lane.points]);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = c.width;
    const h = c.height;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = "#5b8cff";
    ctx.fillStyle = "#5b8cff88";
    if (lane.viz === "bar") {
      const t0 = pts[0]?.tUs ?? 0;
      const t1 = pts[pts.length - 1]?.tUs ?? t0 + 1;
      const span = Math.max(1, t1 - t0);
      for (const p of pts) {
        const x = ((p.tUs - t0) / span) * (w - 4) + 2;
        const bh = (p.value / 127) * (h - 8);
        ctx.fillRect(x - 2, h - 4 - bh, 4, bh);
      }
    } else {
      ctx.beginPath();
      const t0 = pts[0]?.tUs ?? 0;
      const t1 = pts[pts.length - 1]?.tUs ?? t0 + 1;
      const span = Math.max(1, t1 - t0);
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]!;
        const x = ((p.tUs - t0) / span) * (w - 4) + 2;
        const y = h - 4 - (p.value / 127) * (h - 8);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      for (const p of pts) {
        const x = ((p.tUs - t0) / span) * (w - 4) + 2;
        const y = h - 4 - (p.value / 127) * (h - 8);
        ctx.fillRect(x - 2, y - 2, 4, 4);
      }
    }
  }, [lane.viz, pts]);
  return <canvas ref={ref} width={280} height={56} style={{ width: "100%", maxWidth: 320 }} />;
}

export function CcLaneList() {
  const lanes = useAppStore((s) => s.ccLanes);
  const setCcViz = (id: string, viz: CcLaneT["viz"]) => {
    useAppStore.setState((st) => ({
      ccLanes: st.ccLanes.map((l) => (l.id === id ? { ...l, viz } : l)),
    }));
  };
  if (!lanes.length) return <p className="muted">No CC lanes yet (record CC to populate).</p>;
  return (
    <div>
      {lanes.map((l) => (
        <div key={l.id} style={{ marginBottom: "0.75rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">
              CC {l.controller} ch {l.channel + 1}
            </span>
            <select value={l.viz} onChange={(e) => setCcViz(l.id, e.target.value as CcLaneT["viz"])}>
              <option value="line">Line</option>
              <option value="bar">Bar</option>
            </select>
          </div>
          <LaneChart lane={l} />
        </div>
      ))}
    </div>
  );
}
