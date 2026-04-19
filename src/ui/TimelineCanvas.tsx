import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore, rowKeysFromBlocks, channelHue } from "@/store/useAppStore";
import type { NoteBlock } from "@/model/types";
import { parseRowKey, rowKeyForNote } from "@/model/types";
import { snapTimeUs } from "@/model/timeline";

const RAIL = 52;
const HEADER = 20;

type Drag =
  | { kind: "move"; id: string; anchorTUs: number; orig0: number; orig1: number }
  | { kind: "resizeL"; id: string; t0: number; t1: number }
  | { kind: "resizeR"; id: string; t0: number; t1: number }
  | { kind: "pan"; startUs: number; originX: number }
  | null;

function hitTestEdge(x: number, cx: number, w: number): "l" | "r" | null {
  const tol = 6;
  if (Math.abs(x - cx) <= tol) return "l";
  if (Math.abs(x - (cx + w)) <= tol) return "r";
  return null;
}

export function TimelineCanvas() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 800, h: 400 });
  const drag = useRef<Drag>(null);
  const altHover = useRef<string | null>(null);

  const channelFilter = useAppStore((s) => s.channelFilter);
  const allBlocks = useAppStore((s) => s.noteBlocks);
  const noteBlocks =
    channelFilter == null ? allBlocks : allBlocks.filter((b) => b.channel === channelFilter);
  const viewStartUs = useAppStore((s) => s.viewStartUs);
  const viewDurationUs = useAppStore((s) => s.viewDurationUs);
  const setView = useAppStore((s) => s.setView);
  const upsert = useAppStore((s) => s.upsertNoteBlock);
  const del = useAppStore((s) => s.deleteNoteBlock);
  const setSel = useAppStore((s) => s.setSelectedNoteId);
  const internalBpm = useAppStore((s) => s.internalBpm);
  const snap = useAppStore((s) => s.snap);
  const snapBypass = useAppStore((s) => s.snapBypass);
  const rows = useMemo(() => {
    const baseRows = rowKeysFromBlocks(noteBlocks);
    return baseRows.length ? baseRows : [rowKeyForNote(0, 60)];
  }, [noteBlocks]);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setSize({ w: Math.floor(r.width), h: Math.floor(r.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const timeToX = useCallback(
    (tUs: number, w: number) => RAIL + ((tUs - viewStartUs) / viewDurationUs) * (w - RAIL),
    [viewStartUs, viewDurationUs],
  );

  const xToTime = useCallback(
    (x: number, w: number) => viewStartUs + ((x - RAIL) / Math.max(1, w - RAIL)) * viewDurationUs,
    [viewStartUs, viewDurationUs],
  );

  const draw = useCallback(() => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const w = size.w;
    const rowH = 18;
    const h = Math.max(size.h, HEADER + rows.length * rowH);
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = h * dpr;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--bg") || "#0f1218";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#2a3140";
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.fillStyle = "#8b95a8";
    ctx.font = "11px system-ui";
    for (let i = 0; i < rows.length; i++) {
      const y = HEADER + i * rowH;
      ctx.fillRect(0, y, RAIL, rowH - 1);
      const rk = rows[i]!;
      const p = parseRowKey(rk);
      const lab = p ? `${p.note}` : rk;
      ctx.fillStyle = p ? channelHue(p.channel) : "#e8ecf4";
      ctx.fillText(lab, 4, y + 13);
      ctx.strokeStyle = "#2a3140";
      ctx.beginPath();
      ctx.moveTo(0, y + rowH);
      ctx.lineTo(w, y + rowH);
      ctx.stroke();
    }
    for (const b of noteBlocks) {
      const ri = rows.indexOf(b.rowKey);
      if (ri < 0) continue;
      const y = HEADER + ri * rowH + 2;
      const x0 = timeToX(b.tStartUs, w);
      const x1 = timeToX(b.tEndUs, w);
      const cw = Math.max(4, x1 - x0);
      ctx.fillStyle = channelHue(b.channel);
      if (altHover.current === b.id) ctx.fillStyle = "#ff5b6b";
      ctx.fillRect(x0, y, cw, rowH - 5);
      ctx.strokeStyle = "#0006";
      ctx.strokeRect(x0 + 0.5, y + 0.5, cw - 1, rowH - 6);
    }
  }, [noteBlocks, rows, size.w, size.h, timeToX]);

  useEffect(() => {
    draw();
  }, [draw]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const f = e.deltaY > 0 ? 1.08 : 1 / 1.08;
    const center = viewStartUs + viewDurationUs * 0.5;
    const nd = Math.max(200_000, viewDurationUs * f);
    setView(center - nd / 2, nd);
  };

  const findBlock = (x: number, y: number, w: number): NoteBlock | null => {
    const rowH = 18;
    if (x < RAIL || y < HEADER) return null;
    const ri = Math.floor((y - HEADER) / rowH);
    if (ri < 0 || ri >= rows.length) return null;
    const rk = rows[ri]!;
    for (const b of noteBlocks) {
      if (b.rowKey !== rk) continue;
      const x0 = timeToX(b.tStartUs, w);
      const x1 = timeToX(b.tEndUs, w);
      if (x >= x0 && x <= Math.max(x0 + 4, x1)) return b;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = size.w;
    const b = findBlock(x, y, w);
    if (b) {
      const x0 = timeToX(b.tStartUs, w);
      const x1 = timeToX(b.tEndUs, w);
      const edge = hitTestEdge(x, x0, Math.max(4, x1 - x0));
      if (e.shiftKey) return;
      if (e.altKey) {
        del(b.id);
        return;
      }
      setSel(b.id);
      if (edge === "l") drag.current = { kind: "resizeL", id: b.id, t0: b.tStartUs, t1: b.tEndUs };
      else if (edge === "r") drag.current = { kind: "resizeR", id: b.id, t0: b.tStartUs, t1: b.tEndUs };
      else
        drag.current = {
          kind: "move",
          id: b.id,
          anchorTUs: Math.round(xToTime(x, w)),
          orig0: b.tStartUs,
          orig1: b.tEndUs,
        };
      canvas.current?.setPointerCapture(e.pointerId);
      return;
    }
    if (e.shiftKey && x > RAIL) {
      const ri = Math.floor((y - HEADER) / 18);
      if (ri >= 0 && ri < rows.length) {
        const rk = rows[ri]!;
        const p = parseRowKey(rk);
        if (p) {
          const beat = 60_000_000 / internalBpm;
          const sixteenth = beat / 4;
          const t0 = snapTimeUs(Math.round(xToTime(x, w)), internalBpm, snap, snapBypass);
          const nb: NoteBlock = {
            id: crypto.randomUUID(),
            rowKey: rk,
            channel: p.channel,
            note: p.note,
            tStartUs: t0,
            tEndUs: t0 + sixteenth,
            velocity: 100,
          };
          upsert(nb);
        }
      }
      return;
    }
    if (e.button === 1 || (e.button === 0 && e.metaKey)) {
      drag.current = { kind: "pan", startUs: viewStartUs, originX: x };
      canvas.current?.setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const rect = canvas.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = size.w;
    const b = findBlock(x, y, w);
    altHover.current = e.altKey && b ? b.id : null;
    draw();
    const d = drag.current;
    if (!d) return;
    if (d.kind === "pan") {
      const dx = x - d.originX;
      const dt = (-dx / Math.max(1, w - RAIL)) * viewDurationUs;
      setView(d.startUs + dt, viewDurationUs);
      return;
    }
    const t = snapTimeUs(Math.round(xToTime(x, w)), internalBpm, snap, snapBypass);
    const cur = noteBlocks.find((n) => n.id === d.id);
    if (!cur) return;
    if (d.kind === "move") {
      const curT = Math.round(xToTime(x, w));
      const dt = snapTimeUs(curT, internalBpm, snap, snapBypass) - snapTimeUs(d.anchorTUs, internalBpm, snap, snapBypass);
      upsert({
        ...cur,
        tStartUs: d.orig0 + dt,
        tEndUs: d.orig1 + dt,
      });
    } else if (d.kind === "resizeL") {
      upsert({ ...cur, tStartUs: Math.min(t, cur.tEndUs - 10_000), tEndUs: cur.tEndUs });
    } else if (d.kind === "resizeR") {
      upsert({ ...cur, tStartUs: cur.tStartUs, tEndUs: Math.max(t, cur.tStartUs + 10_000) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    drag.current = null;
    canvas.current?.releasePointerCapture(e.pointerId);
  };

  const onPointerLeave = () => {
    altHover.current = null;
    draw();
  };

  return (
    <div ref={wrap} className="timeline-wrap" style={{ flex: 1, minHeight: 200 }}>
      <canvas
        ref={canvas}
        style={{ display: "block", width: "100%", touchAction: "none", cursor: altHover.current ? "not-allowed" : "default" }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
      />
      <div className="toolbar muted" style={{ fontSize: "0.75rem", padding: "0.25rem" }}>
        Wheel zoom · drag note · edges resize · Shift+click row adds note · Alt hover delete click · ⌘/middle pan
      </div>
    </div>
  );
}
