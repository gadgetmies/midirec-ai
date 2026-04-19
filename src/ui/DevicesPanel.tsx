import { useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { midiSupported } from "@/midi/webmidi";
import { toast } from "@/ui/toast";

export function DevicesPanel() {
  const initMidi = useAppStore((s) => s.initMidi);
  const inputs = useAppStore((s) => s.inputs);
  const outputs = useAppStore((s) => s.outputs);
  const armed = useAppStore((s) => s.armedInputIds);
  const toggleArm = useAppStore((s) => s.toggleArmInput);
  const toggleOut = useAppStore((s) => s.togglePlaybackOut);
  const playOut = useAppStore((s) => s.playbackOutputIds);
  const isRecording = useAppStore((s) => s.isRecording);
  const startRecord = useAppStore((s) => s.startRecord);
  const stopRecord = useAppStore((s) => s.stopRecord);
  const importNdjson = useAppStore((s) => s.importNdjson);
  const importSmf = useAppStore((s) => s.importSmfFile);
  const exportNdjson = useAppStore((s) => s.exportNdjson);
  const exportSmf = useAppStore((s) => s.exportSmf);
  const ndjsonIn = useRef<HTMLInputElement>(null);
  const smfIn = useRef<HTMLInputElement>(null);

  if (!midiSupported()) {
    return (
      <div className="panel">
        <p className="muted">Web MIDI is not available in this browser. Use a Chromium-based browser over HTTPS.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="toolbar" style={{ marginBottom: "0.5rem" }}>
        <button type="button" className="primary" onClick={() => void initMidi()}>
          Connect MIDI
        </button>
        <button type="button" disabled={isRecording} onClick={() => startRecord()}>
          Record
        </button>
        <button type="button" disabled={!isRecording} onClick={() => stopRecord()}>
          Stop
        </button>
      </div>
      <h2 style={{ fontSize: "0.9rem" }}>Inputs (arm to record)</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem" }}>
        {inputs.map((p) => (
          <li key={p.id} className="row" style={{ marginBottom: "0.25rem" }}>
            <label className="row">
              <input
                type="checkbox"
                checked={armed.includes(p.id)}
                onChange={() => toggleArm(p.id)}
              />
              {p.name || p.id}
            </label>
          </li>
        ))}
      </ul>
      <h2 style={{ fontSize: "0.9rem" }}>Outputs (playback)</h2>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 0.75rem" }}>
        {outputs.map((p) => (
          <li key={p.id} className="row" style={{ marginBottom: "0.25rem" }}>
            <label className="row">
              <input
                type="checkbox"
                checked={playOut.includes(p.id)}
                onChange={() => toggleOut(p.id)}
              />
              {p.name || p.id}
            </label>
          </li>
        ))}
      </ul>
      <div className="toolbar" style={{ flexDirection: "column", alignItems: "stretch", gap: "0.35rem" }}>
        <button
          type="button"
          onClick={() => {
            exportNdjson();
            toast("Exported NDJSON");
          }}
        >
          Download NDJSON
        </button>
        <button
          type="button"
          onClick={() => {
            exportSmf();
            toast("Exported SMF");
          }}
        >
          Download SMF
        </button>
        <button type="button" onClick={() => ndjsonIn.current?.click()}>
          Import NDJSON
        </button>
        <input
          ref={ndjsonIn}
          type="file"
          accept=".ndjson,.txt,.jsonl"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              await importNdjson(f);
              toast("Imported NDJSON");
            } catch (err) {
              toast(String(err));
            }
          }}
        />
        <button type="button" onClick={() => smfIn.current?.click()}>
          Import SMF
        </button>
        <input
          ref={smfIn}
          type="file"
          accept=".mid,.midi,audio/midi"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              await importSmf(f);
              toast("Imported SMF");
            } catch (err) {
              toast(String(err));
            }
          }}
        />
      </div>
    </div>
  );
}
