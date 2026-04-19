import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { clockIntervalMs, beatsFromPlayheadUs, formatPhraseBarBeat, musicalPositionFromBeats } from "@/midi/clock";

export function TransportBar() {
  const isPlaying = useAppStore((s) => s.isPlaying);
  const tickPlayback = useAppStore((s) => s.tickPlayback);
  const phrase = useAppStore((s) =>
    formatPhraseBarBeat(
      musicalPositionFromBeats(
        beatsFromPlayheadUs(s.playheadUs, s.internalBpm, s.downbeatOffsetBeats),
        s.phraseLenBars,
      ),
    ),
  );
  const internalBpm = useAppStore((s) => s.internalBpm);
  const useExternalClock = useAppStore((s) => s.useExternalClock);
  const clockOutEnabled = useAppStore((s) => s.clockOutEnabled);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (!isPlaying) {
      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = null;
      return;
    }
    const loop = (t: number) => {
      tickPlayback(t);
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [isPlaying, tickPlayback]);

  useEffect(() => {
    if (!clockOutEnabled || useExternalClock || !isPlaying) return;
    const id = window.setInterval(() => {
      const st = useAppStore.getState();
      if (!st.clockOutEnabled || st.useExternalClock || !st.isPlaying) return;
      const tick = new Uint8Array([0xf8]);
      for (const o of st.outputs) {
        if (st.clockOutOutputIds.includes(o.id)) {
          try {
            o.send(tick);
          } catch {
            /* ignore */
          }
        }
      }
    }, clockIntervalMs(internalBpm));
    return () => window.clearInterval(id);
  }, [clockOutEnabled, useExternalClock, isPlaying, internalBpm]);

  return (
    <div className="toolbar panel" style={{ margin: "0.5rem", padding: "0.5rem" }}>
      <div className="row" style={{ justifyContent: "space-between", width: "100%" }}>
        <div className="row">
          <button type="button" className="primary" onClick={() => useAppStore.getState().transportPlay()}>
            Play
          </button>
          <button type="button" onClick={() => useAppStore.getState().transportPause()}>Pause</button>
          <button type="button" onClick={() => useAppStore.getState().transportCue()}>Cue</button>
          <button type="button" onClick={() => useAppStore.getState().skipStart()}>|&lt;</button>
          <button type="button" onClick={() => useAppStore.getState().skipEnd()}>&gt;|</button>
        </div>
        <div className="row muted" aria-live="polite">
          <span title="phrase.bar.beat (4/4)">{phrase}</span>
        </div>
        <div className="row">
          <label className="muted">
            BPM
            <input
              type="number"
              min={20}
              max={300}
              value={internalBpm}
              onChange={(e) => useAppStore.getState().setInternalBpm(Number(e.target.value))}
              style={{ width: "4.5rem" }}
            />
          </label>
          <label className="row muted">
            <input
              type="checkbox"
              checked={useExternalClock}
              onChange={(e) => useAppStore.getState().setUseExternalClock(e.target.checked)}
            />
            External clock
          </label>
          <button type="button" onClick={() => useAppStore.getState().tapDownbeat()}>
            Downbeat
          </button>
          <label className="row muted">
            <input
              type="checkbox"
              checked={clockOutEnabled}
              onChange={(e) => useAppStore.getState().setClockOutEnabled(e.target.checked)}
            />
            Clock out
          </label>
        </div>
      </div>
    </div>
  );
}
