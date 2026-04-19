import type { MidiCategory } from "@/model/types";
import { useAppStore } from "@/store/useAppStore";

const labels: { k: MidiCategory; l: string }[] = [
  { k: "note", l: "Notes" },
  { k: "polyAftertouch", l: "Poly AT" },
  { k: "cc", l: "CC" },
  { k: "programChange", l: "Program" },
  { k: "channelPressure", l: "Ch pressure" },
  { k: "pitchBend", l: "Pitch bend" },
  { k: "realtime", l: "Realtime / clock" },
  { k: "sysex", l: "SysEx" },
];

export function RecordFilterPanel() {
  const f = useAppStore((s) => s.recordFilter);
  const set = useAppStore((s) => s.setRecordFilter);
  const preset = useAppStore((s) => s.applyPresetFilter);
  return (
    <div className="panel">
      <h2 style={{ fontSize: "0.9rem" }}>Record filter</h2>
      <div className="toolbar" style={{ marginBottom: "0.5rem" }}>
        <button type="button" onClick={() => preset("all")}>
          All
        </button>
        <button type="button" onClick={() => preset("notesOnly")}>
          Notes only
        </button>
        <button type="button" onClick={() => preset("noClock")}>
          No clock
        </button>
        <button type="button" onClick={() => preset("noSysex")}>
          No SysEx
        </button>
      </div>
      {labels.map(({ k, l }) => (
        <label key={k} className="row" style={{ display: "flex", marginBottom: "0.2rem" }}>
          <input type="checkbox" checked={f[k]} onChange={(e) => set({ [k]: e.target.checked })} />
          {l}
        </label>
      ))}
    </div>
  );
}
