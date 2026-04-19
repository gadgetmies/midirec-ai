import { useEffect, useState } from "react";
import { useAppStore, rowKeysFromBlocks } from "@/store/useAppStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastHost } from "@/ui/ToastHost";
import { TransportBar } from "@/ui/TransportBar";
import { DevicesPanel } from "@/ui/DevicesPanel";
import { RecordFilterPanel } from "@/ui/RecordFilterPanel";
import { RoutingPanel } from "@/ui/RoutingPanel";
import { TimelineCanvas } from "@/ui/TimelineCanvas";
import { CcLaneList } from "@/ui/CcLane";
import { InspectorPanel } from "@/ui/InspectorPanel";
import { ShortcutsModal } from "@/ui/ShortcutsModal";
import { RecordingModesPanel } from "@/ui/RecordingModesPanel";
import { rowKeyForNote } from "@/model/types";
import type { SnapDivision } from "@/model/timeline";
import { toast } from "@/ui/toast";

function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const st = useAppStore.getState();
      if (e.code === "Space") {
        e.preventDefault();
        if (st.isPlaying) st.transportPause();
        else st.transportPlay();
      }
      if (e.code === "Home") {
        e.preventDefault();
        st.skipStart();
      }
      if (e.code === "End") {
        e.preventDefault();
        st.skipEnd();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function MetaToolbar() {
  const playheadUs = useAppStore((s) => s.playheadUs);
  const addMarker = useAppStore((s) => s.addMarker);
  const addLabel = useAppStore((s) => s.addLabel);
  const markers = useAppStore((s) => s.markers);
  const loopA = useAppStore((s) => s.loopAUs);
  const loopB = useAppStore((s) => s.loopBUs);
  const setLoop = useAppStore((s) => s.setLoopAB);
  return (
    <div className="toolbar panel" style={{ margin: "0 0.5rem 0.5rem", flexWrap: "wrap", gap: "0.35rem" }}>
      <button
        type="button"
        onClick={() => {
          const name = window.prompt("Marker name", "Marker");
          if (!name) return;
          addMarker({ id: crypto.randomUUID(), name, tUs: playheadUs });
          toast("Marker added");
        }}
      >
        Marker at playhead
      </button>
      <button
        type="button"
        onClick={() => {
          const text = window.prompt("Label text", "Section");
          if (!text) return;
          const rows = rowKeysFromBlocks(useAppStore.getState().noteBlocks);
          const rowKeys = rows.length ? rows : [rowKeyForNote(0, 60)];
          addLabel({
            id: crypto.randomUUID(),
            text,
            tStartUs: playheadUs,
            tEndUs: playheadUs + 1_000_000,
            rowKeys,
          });
          toast("Label added");
        }}
      >
        Label from playhead
      </button>
      <button type="button" onClick={() => setLoop(playheadUs, loopB)}>
        Set loop A
      </button>
      <button type="button" onClick={() => setLoop(loopA, playheadUs)}>
        Set loop B
      </button>
      <button type="button" onClick={() => setLoop(null, null)}>
        Clear loop
      </button>
      <span className="muted">
        Markers: {markers.length} · Loop: {loopA != null && loopB != null ? "on" : "off"}
      </span>
    </div>
  );
}

export default function App() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const error = useAppStore((s) => s.error);
  const highContrast = useAppStore((s) => s.highContrast);
  const setHC = useAppStore((s) => s.setHighContrast);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const snap = useAppStore((s) => s.snap);
  const setSnap = useAppStore((s) => s.setSnap);
  const snapBypass = useAppStore((s) => s.snapBypass);
  const setSnapBypass = useAppStore((s) => s.setSnapBypass);
  const chF = useAppStore((s) => s.channelFilter);
  const setChF = useAppStore((s) => s.setChannelFilter);
  const addSelectionRect = useAppStore((s) => s.addSelectionRect);
  const exportSelectionNdjson = useAppStore((s) => s.exportSelectionNdjson);

  useKeyboardShortcuts();

  useEffect(() => {
    void useAppStore.getState().initMidi();
    void useAppStore.getState().loadDraft();
  }, []);

  useEffect(() => {
    document.body.classList.toggle("high-contrast", highContrast);
  }, [highContrast]);

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <header className="toolbar panel" style={{ margin: "0.5rem", alignItems: "center", justifyContent: "space-between" }}>
          <h1>midirec</h1>
          <div className="row">
            <button type="button" onClick={() => undo()}>
              Undo
            </button>
            <button type="button" onClick={() => redo()}>
              Redo
            </button>
            <label className="row muted">
              Snap
              <select value={snap} onChange={(e) => setSnap(e.target.value as SnapDivision)}>
                <option value="1">1/1</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="1/8">1/8</option>
                <option value="1/16">1/16</option>
                <option value="1/32">1/32</option>
              </select>
            </label>
            <label className="row muted">
              <input type="checkbox" checked={snapBypass} onChange={(e) => setSnapBypass(e.target.checked)} />
              Snap bypass (hold Alt while dragging in future)
            </label>
            <label className="row muted">
              Channel
              <select
                value={chF == null ? "" : String(chF)}
                onChange={(e) => setChF(e.target.value === "" ? null : Number(e.target.value))}
              >
                <option value="">All</option>
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <label className="row muted">
              <input type="checkbox" checked={highContrast} onChange={(e) => setHC(e.target.checked)} />
              High contrast
            </label>
            <button type="button" onClick={() => setShortcutsOpen(true)}>
              Shortcuts
            </button>
          </div>
        </header>
        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}
        <TransportBar />
        <MetaToolbar />
        <div className="panels">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: 0 }}>
            <DevicesPanel />
            <RecordFilterPanel />
            <RecordingModesPanel />
            <RoutingPanel />
            <InspectorPanel />
          </div>
          <div className="timeline-wrap panel" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="toolbar" style={{ padding: "0.35rem" }}>
              <button
                type="button"
                onClick={(ev) => {
                  const st = useAppStore.getState();
                  const rows = rowKeysFromBlocks(st.noteBlocks);
                  const rowKeys = rows.length ? rows : [rowKeyForNote(0, 60)];
                  addSelectionRect(
                    {
                      id: crypto.randomUUID(),
                      t0Us: st.viewStartUs,
                      t1Us: st.viewStartUs + st.viewDurationUs,
                      rowKeys,
                    },
                    ev.shiftKey,
                  );
                  toast("Selection updated");
                }}
              >
                Select viewport
              </button>
              <button type="button" onClick={() => exportSelectionNdjson()}>
                Export selection NDJSON
              </button>
            </div>
            <TimelineCanvas />
            <div style={{ padding: "0.5rem", borderTop: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "0.85rem", margin: "0 0 0.35rem" }}>CC lanes</h2>
              <CcLaneList />
            </div>
          </div>
        </div>
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
        <ToastHost />
      </div>
    </ErrorBoundary>
  );
}
