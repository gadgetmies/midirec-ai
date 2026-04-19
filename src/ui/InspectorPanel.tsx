import { useAppStore } from "@/store/useAppStore";

export function InspectorPanel() {
  const id = useAppStore((s) => s.selectedNoteId);
  const block = useAppStore((s) => s.noteBlocks.find((b) => b.id === id));
  const patch = useAppStore((s) => s.patchNoteBlock);
  if (!block) {
    return (
      <div className="panel">
        <h2 style={{ fontSize: "0.9rem" }}>Inspector</h2>
        <p className="muted">Select a note block on the timeline.</p>
      </div>
    );
  }
  return (
    <div className="panel">
      <h2 style={{ fontSize: "0.9rem" }}>Inspector</h2>
      <label className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.2rem" }}>
        Start (µs)
        <input
          type="number"
          value={Math.round(block.tStartUs)}
          onChange={(e) => patch(block.id, { tStartUs: Number(e.target.value) })}
        />
      </label>
      <label className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.2rem" }}>
        End (µs)
        <input
          type="number"
          value={Math.round(block.tEndUs)}
          onChange={(e) => patch(block.id, { tEndUs: Number(e.target.value) })}
        />
      </label>
      <label className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.2rem" }}>
        Velocity
        <input
          type="number"
          min={1}
          max={127}
          value={block.velocity}
          onChange={(e) => patch(block.id, { velocity: Number(e.target.value) })}
        />
      </label>
      <label className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.2rem" }}>
        Channel (0–15)
        <input
          type="number"
          min={0}
          max={15}
          value={block.channel}
          onChange={(e) => patch(block.id, { channel: Number(e.target.value) })}
        />
      </label>
      <label className="row" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.2rem" }}>
        Note (0–127)
        <input
          type="number"
          min={0}
          max={127}
          value={block.note}
          onChange={(e) => patch(block.id, { note: Number(e.target.value) })}
        />
      </label>
    </div>
  );
}
