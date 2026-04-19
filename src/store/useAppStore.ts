import { create } from "zustand";
import { buildNoteBlocksFromMidiLines, resolveOverlappingNotes } from "@/model/overlap";
import type {
  CcLane,
  NDJSONLine,
  NoteBlock,
  RecordFilterMap,
  RecordingMode,
  RowKey,
  SelectionRect,
  TimelineLabel,
  TimelineMarker,
} from "@/model/types";
import { defaultRecordFilter, rowKeyForNote } from "@/model/types";
import { lineFromMidiMessage } from "@/midi/record";
import { isClockRealtimeByte } from "@/midi/recordFilter";
import { requestWebMidi } from "@/midi/webmidi";
import type { ExternalClockState } from "@/midi/clock";
import { reduceExternalClockByte } from "@/midi/clock";
import { beatsFromPlayheadUs } from "@/midi/clock";
import type { SnapDivision } from "@/model/timeline";
import { readNdjsonFile, downloadNdjson } from "@/io/ndjson";
import { noteBlocksFromSmf, smfBytesFromNoteBlocks, downloadSmf } from "@/io/smf";
import { scheduleNoteBlocks } from "@/midi/playback";
import { saveDraftJson, loadDraftJson } from "@/persist/draft";

type UndoSnap = {
  noteBlocks: NoteBlock[];
  labels: TimelineLabel[];
  markers: TimelineMarker[];
  ccLanes: CcLane[];
  lines: NDJSONLine[];
};

export type AppState = {
  error: string | null;
  midiAccess: MIDIAccess | null;
  inputs: MIDIInput[];
  outputs: MIDIOutput[];
  armedInputIds: string[];
  playbackOutputIds: string[];
  clockOutOutputIds: string[];
  clockOutEnabled: boolean;
  recordFilter: RecordFilterMap;
  lines: NDJSONLine[];
  noteBlocks: NoteBlock[];
  ccLanes: CcLane[];
  labels: TimelineLabel[];
  markers: TimelineMarker[];
  selectionRects: SelectionRect[];
  rowRouting: Record<RowKey, string[]>;
  isRecording: boolean;
  recordOriginPerf: number | null;
  recordLineStart: number;
  recordTimeBaseUs: number;
  recordingMode: RecordingMode;
  punchEnabled: boolean;
  punchT0Us: number;
  punchT1Us: number;
  latencyRecordMs: number;
  latencyPlayMs: number;
  playheadUs: number;
  isPlaying: boolean;
  internalBpm: number;
  useExternalClock: boolean;
  phraseLenBars: number;
  downbeatOffsetBeats: number;
  externalClock: ExternalClockState;
  cuePointUs: number | null;
  pausedAfterCue: boolean;
  loopAUs: number | null;
  loopBUs: number | null;
  commandMode: boolean;
  snap: SnapDivision;
  snapBypass: boolean;
  highContrast: boolean;
  channelFilter: number | null;
  setChannelFilter: (ch: number | null) => void;
  viewStartUs: number;
  viewDurationUs: number;
  undoStack: UndoSnap[];
  redoStack: UndoSnap[];
  lastRaf: number | null;
  selectedNoteId: string | null;
  setSelectedNoteId: (id: string | null) => void;
  pushUndo: () => void;
  initMidi: () => Promise<void>;
  refreshPorts: () => void;
  toggleArmInput: (id: string) => void;
  togglePlaybackOut: (id: string) => void;
  toggleClockOut: (id: string) => void;
  setRecordFilter: (f: Partial<RecordFilterMap>) => void;
  applyPresetFilter: (preset: "all" | "notesOnly" | "noClock" | "noSysex") => void;
  startRecord: () => void;
  stopRecord: () => void;
  importNdjson: (file: File) => Promise<void>;
  importSmfFile: (file: File) => Promise<void>;
  exportNdjson: () => void;
  exportSmf: () => void;
  setPlayhead: (t: number) => void;
  transportPlay: () => void;
  transportPause: () => void;
  transportCue: () => void;
  skipStart: () => void;
  skipEnd: () => void;
  setInternalBpm: (b: number) => void;
  setUseExternalClock: (v: boolean) => void;
  tapDownbeat: () => void;
  setClockOutEnabled: (v: boolean) => void;
  setRecordingMode: (m: RecordingMode) => void;
  setPunch: (en: boolean, t0?: number, t1?: number) => void;
  setLatency: (rec: number, play: number) => void;
  setLoopAB: (a: number | null, b: number | null) => void;
  setCommandMode: (v: boolean) => void;
  setSnap: (s: SnapDivision) => void;
  setSnapBypass: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setView: (startUs: number, durationUs: number) => void;
  upsertNoteBlock: (b: NoteBlock) => void;
  patchNoteBlock: (id: string, p: Partial<NoteBlock>) => void;
  deleteNoteBlock: (id: string) => void;
  addLabel: (l: TimelineLabel) => void;
  addMarker: (m: TimelineMarker) => void;
  addSelectionRect: (r: SelectionRect, additive: boolean) => void;
  exportSelectionNdjson: () => void;
  setRowRouting: (row: RowKey, outs: string[]) => void;
  tickPlayback: (now: number) => void;
  undo: () => void;
  redo: () => void;
  persistDraftSoon: () => void;
  loadDraft: () => Promise<void>;
};

let draftTimer: number | null = null;

function snapshot(s: AppState): UndoSnap {
  return {
    noteBlocks: s.noteBlocks.map((x) => ({ ...x })),
    labels: s.labels.map((x) => ({ ...x, rowKeys: [...x.rowKeys] })),
    markers: s.markers.map((x) => ({ ...x })),
    ccLanes: s.ccLanes.map((x) => ({ ...x, points: x.points.map((p) => ({ ...p })) })),
    lines: s.lines.map((x) => JSON.parse(JSON.stringify(x)) as NDJSONLine),
  };
}

function maxEndUs(blocks: NoteBlock[]): number {
  return blocks.reduce((m, b) => Math.max(m, b.tEndUs), 0);
}

export const useAppStore = create<AppState>((set, get) => ({
  error: null,
  midiAccess: null,
  inputs: [],
  outputs: [],
  armedInputIds: [],
  playbackOutputIds: [],
  clockOutOutputIds: [],
  clockOutEnabled: false,
  recordFilter: defaultRecordFilter(),
  lines: [],
  noteBlocks: [],
  ccLanes: [],
  labels: [],
  markers: [],
  selectionRects: [],
  rowRouting: {},
  isRecording: false,
  recordOriginPerf: null,
  recordLineStart: 0,
  recordTimeBaseUs: 0,
  recordingMode: "appendEnd",
  punchEnabled: false,
  punchT0Us: 0,
  punchT1Us: 0,
  latencyRecordMs: 0,
  latencyPlayMs: 0,
  playheadUs: 0,
  isPlaying: false,
  internalBpm: 120,
  useExternalClock: false,
  phraseLenBars: 4,
  downbeatOffsetBeats: 0,
  externalClock: { ticks: 0, playing: false },
  cuePointUs: null,
  pausedAfterCue: false,
  loopAUs: null,
  loopBUs: null,
  commandMode: false,
  snap: "1/16",
  snapBypass: false,
  highContrast: false,
  channelFilter: null,
  setChannelFilter: (ch) => set({ channelFilter: ch }),
  viewStartUs: 0,
  viewDurationUs: 8_000_000,
  undoStack: [],
  redoStack: [],
  lastRaf: null,
  selectedNoteId: null,

  setSelectedNoteId: (id) => set({ selectedNoteId: id }),

  pushUndo: () => {
    const snap = snapshot(get());
    set((s) => ({ undoStack: [...s.undoStack, snap].slice(-50), redoStack: [] }));
  },

  initMidi: async () => {
    try {
      const access = await requestWebMidi(true);
      set({ midiAccess: access, error: null });
      const refresh = () => {
        const inputs = [...access.inputs.values()];
        const outputs = [...access.outputs.values()];
        set({ inputs, outputs });
      };
      refresh();
      access.addEventListener("statechanged", refresh);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  refreshPorts: () => {
    const access = get().midiAccess;
    if (!access) return;
    set({
      inputs: [...access.inputs.values()],
      outputs: [...access.outputs.values()],
    });
  },

  toggleArmInput: (id) =>
    set((s) => ({
      armedInputIds: s.armedInputIds.includes(id)
        ? s.armedInputIds.filter((x) => x !== id)
        : [...s.armedInputIds, id],
    })),

  togglePlaybackOut: (id) =>
    set((s) => ({
      playbackOutputIds: s.playbackOutputIds.includes(id)
        ? s.playbackOutputIds.filter((x) => x !== id)
        : [...s.playbackOutputIds, id],
    })),

  toggleClockOut: (id) =>
    set((s) => ({
      clockOutOutputIds: s.clockOutOutputIds.includes(id)
        ? s.clockOutOutputIds.filter((x) => x !== id)
        : [...s.clockOutOutputIds, id],
    })),

  setRecordFilter: (f) => set((s) => ({ recordFilter: { ...s.recordFilter, ...f } })),

  applyPresetFilter: (preset) => {
    const all = defaultRecordFilter();
    if (preset === "all") return set({ recordFilter: all });
    if (preset === "notesOnly")
      return set({
        recordFilter: {
          ...all,
          polyAftertouch: false,
          cc: false,
          programChange: false,
          channelPressure: false,
          pitchBend: false,
          realtime: false,
          sysex: false,
        },
      });
    if (preset === "noClock")
      return set({ recordFilter: { ...all, realtime: false } });
    if (preset === "noSysex") return set({ recordFilter: { ...all, sysex: false } });
  },

  startRecord: () => {
    const s = get();
    const origin = performance.now();
    let base = 0;
    if (s.recordingMode === "appendEnd") base = maxEndUs(s.noteBlocks);
    else base = s.playheadUs;
    const inputs = s.inputs.filter((i) => s.armedInputIds.includes(i.id));
    if (!inputs.length) {
      set({ error: "Arm at least one input to record." });
      return;
    }
    set({
      isRecording: true,
      recordOriginPerf: origin,
      recordLineStart: get().lines.length,
      recordTimeBaseUs: base,
      error: null,
    });
    const latUs = s.latencyRecordMs * 1000;
    const filter = get().recordFilter;
    for (const input of inputs) {
      input.onmidimessage = (ev) => {
        const st = get();
        if (!st.isRecording) return;
        const tRaw = (performance.now() - (st.recordOriginPerf ?? origin)) * 1000;
        const tUs = Math.max(0, Math.round(tRaw + st.recordTimeBaseUs + latUs));
        if (st.punchEnabled) {
          if (tUs < st.punchT0Us || tUs > st.punchT1Us) return;
        }
        const data = ev.data!;
        const line = lineFromMidiMessage(ev, tUs, filter);
        if (!line) {
          const b0 = data[0] ?? 0;
          if (st.useExternalClock && isClockRealtimeByte(b0)) {
            set({ externalClock: reduceExternalClockByte(st.externalClock, b0) });
          }
          return;
        }
        if (line.kind === "midi") {
          const u = new Uint8Array(line.bytes);
          const hi = (u[0] ?? 0) & 0xf0;
          if (hi === 0xb0) {
            const ch = (u[0] ?? 0) & 0x0f;
            const cc = u[1] ?? 0;
            const val = u[2] ?? 0;
            const dev = line.deviceId ?? "unknown";
            set((cur) => {
              const id = `${dev}-${ch}-${cc}`;
              let lane = cur.ccLanes.find((l) => l.id === id);
              const nextLanes = [...cur.ccLanes];
              if (!lane) {
                lane = {
                  id,
                  deviceId: dev,
                  channel: ch,
                  controller: cc,
                  viz: "line",
                  points: [],
                };
                nextLanes.push(lane);
              }
              const pts = [...lane.points, { tUs, value: val }].slice(-4000);
              lane = { ...lane, points: pts };
              const idx = nextLanes.findIndex((l) => l.id === id);
              nextLanes[idx] = lane;
              return { ccLanes: nextLanes, lines: [...cur.lines, line] };
            });
            return;
          }
        }
        set((cur) => ({ lines: [...cur.lines, line] }));
      };
    }
  },

  stopRecord: () => {
    const s = get();
    for (const input of s.inputs) input.onmidimessage = null;
    const slice = s.lines.slice(s.recordLineStart);
    const midiLines = slice
      .filter((l): l is Extract<typeof l, { kind: "midi" }> => l.kind === "midi")
      .map((l) => ({ tUs: l.tUs, bytes: l.bytes }));
    const fresh = buildNoteBlocksFromMidiLines(midiLines);
    const merged = resolveOverlappingNotes([...s.noteBlocks, ...fresh]);
    set({
      isRecording: false,
      recordOriginPerf: null,
      noteBlocks: merged,
    });
    get().persistDraftSoon();
  },

  importNdjson: async (file) => {
    const lines = await readNdjsonFile(file);
    const midi = lines
      .filter((l): l is Extract<typeof l, { kind: "midi" }> => l.kind === "midi")
      .map((l) => ({ tUs: l.tUs, bytes: l.bytes }));
    const blocks = buildNoteBlocksFromMidiLines(midi);
    set({ lines, noteBlocks: resolveOverlappingNotes(blocks) });
    get().persistDraftSoon();
  },

  importSmfFile: async (file) => {
    const buf = new Uint8Array(await file.arrayBuffer());
    const { blocks, bpm } = noteBlocksFromSmf(buf);
    set({ noteBlocks: resolveOverlappingNotes(blocks), internalBpm: bpm });
    get().persistDraftSoon();
  },

  exportNdjson: () => {
    downloadNdjson("session.ndjson", get().lines);
  },

  exportSmf: () => {
    const bytes = smfBytesFromNoteBlocks(get().noteBlocks, get().internalBpm);
    downloadSmf("session.mid", bytes);
  },

  setPlayhead: (t) => set({ playheadUs: Math.max(0, t) }),

  transportPlay: () => {
    const s = get();
    set({ isPlaying: true, pausedAfterCue: false, lastRaf: performance.now() });
    const outsMap = new Map<string, MIDIOutput>();
    for (const id of s.playbackOutputIds) {
      const o = s.outputs.find((x) => x.id === id);
      if (o) outsMap.set(o.id, o);
    }
    for (const b of s.noteBlocks) {
      for (const id of s.rowRouting[b.rowKey] ?? []) {
        const o = s.outputs.find((x) => x.id === id);
        if (o) outsMap.set(o.id, o);
      }
    }
    const outs = [...outsMap.values()];
    const origin = performance.now() + s.latencyPlayMs;
    scheduleNoteBlocks(
      s.noteBlocks.filter((b) => b.tEndUs > s.playheadUs),
      outs,
      s.playheadUs,
      origin,
    );
  },

  transportPause: () => set({ isPlaying: false, lastRaf: null }),

  transportCue: () => {
    const s = get();
    if (!s.isPlaying) {
      if (s.cuePointUs == null) set({ cuePointUs: s.playheadUs, pausedAfterCue: true });
      else set({ playheadUs: s.cuePointUs });
      return;
    }
    set({ isPlaying: false, cuePointUs: s.playheadUs, pausedAfterCue: true, lastRaf: null });
  },

  skipStart: () => set({ playheadUs: 0 }),
  skipEnd: () => set((s) => ({ playheadUs: maxEndUs(s.noteBlocks) })),

  setInternalBpm: (b) => set({ internalBpm: Math.max(20, Math.min(300, b)) }),
  setUseExternalClock: (v) => set({ useExternalClock: v }),
  tapDownbeat: () =>
    set((s) => ({
      downbeatOffsetBeats: -beatsFromPlayheadUs(s.playheadUs, s.internalBpm, 0),
    })),

  setClockOutEnabled: (v) => set({ clockOutEnabled: v }),
  setRecordingMode: (m) => set({ recordingMode: m }),
  setPunch: (en, t0 = 0, t1 = 0) =>
    set({ punchEnabled: en, punchT0Us: t0, punchT1Us: t1 }),
  setLatency: (rec, play) => set({ latencyRecordMs: rec, latencyPlayMs: play }),

  setLoopAB: (a, b) => set({ loopAUs: a, loopBUs: b }),
  setCommandMode: (v) => set({ commandMode: v }),
  setSnap: (snap) => set({ snap }),
  setSnapBypass: (v) => set({ snapBypass: v }),
  setHighContrast: (v) => set({ highContrast: v }),
  setView: (startUs, durationUs) => set({ viewStartUs: startUs, viewDurationUs: durationUs }),

  upsertNoteBlock: (b) => {
    get().pushUndo();
    set((s) => ({
      noteBlocks: resolveOverlappingNotes([...s.noteBlocks.filter((x) => x.id !== b.id), b]),
    }));
    get().persistDraftSoon();
  },

  patchNoteBlock: (id, p) => {
    get().pushUndo();
    set((s) => ({
      noteBlocks: resolveOverlappingNotes(
        s.noteBlocks.map((b) => {
          if (b.id !== id) return b;
          const n = { ...b, ...p };
          if (p.channel !== undefined || p.note !== undefined) {
            n.rowKey = rowKeyForNote(n.channel, n.note);
          }
          return n;
        }),
      ),
    }));
    get().persistDraftSoon();
  },

  deleteNoteBlock: (id) => {
    get().pushUndo();
    set((s) => ({ noteBlocks: s.noteBlocks.filter((b) => b.id !== id) }));
    get().persistDraftSoon();
  },

  addLabel: (l) => {
    get().pushUndo();
    set((s) => ({ labels: [...s.labels, l] }));
    get().persistDraftSoon();
  },

  addMarker: (m) => {
    get().pushUndo();
    set((s) => ({ markers: [...s.markers, m] }));
    get().persistDraftSoon();
  },

  addSelectionRect: (r, additive) =>
    set((s) => ({
      selectionRects: additive ? [...s.selectionRects, r] : [r],
    })),

  exportSelectionNdjson: () => {
    const s = get();
    if (!s.selectionRects.length) return;
    const rect = s.selectionRects[0]!;
    const t0 = Math.min(rect.t0Us, rect.t1Us);
    const t1 = Math.max(rect.t0Us, rect.t1Us);
    const lines = s.lines.filter((l) => "tUs" in l && l.tUs >= t0 && l.tUs <= t1);
    downloadNdjson("selection.ndjson", lines);
  },

  setRowRouting: (row, outs) =>
    set((s) => ({ rowRouting: { ...s.rowRouting, [row]: outs } })),

  tickPlayback: (now) => {
    const s = get();
    if (!s.isPlaying) return;
    const last = s.lastRaf ?? now;
    const dt = (now - last) * 1000;
    let nh = s.playheadUs + dt;
    if (s.loopAUs != null && s.loopBUs != null) {
      const lo = Math.min(s.loopAUs, s.loopBUs);
      const hi = Math.max(s.loopAUs, s.loopBUs);
      if (nh > hi) nh = lo;
    }
    set({ playheadUs: nh, lastRaf: now });
  },

  undo: () => {
    const st = get();
    if (!st.undoStack.length) return;
    const prev = st.undoStack[st.undoStack.length - 1]!;
    set((s) => ({
      redoStack: [...s.redoStack, snapshot(s)],
      undoStack: s.undoStack.slice(0, -1),
      noteBlocks: prev.noteBlocks,
      labels: prev.labels,
      markers: prev.markers,
      ccLanes: prev.ccLanes,
      lines: prev.lines,
    }));
  },

  redo: () => {
    const st = get();
    if (!st.redoStack.length) return;
    const nxt = st.redoStack[st.redoStack.length - 1]!;
    set((s) => ({
      undoStack: [...s.undoStack, snapshot(s)],
      redoStack: s.redoStack.slice(0, -1),
      noteBlocks: nxt.noteBlocks,
      labels: nxt.labels,
      markers: nxt.markers,
      ccLanes: nxt.ccLanes,
      lines: nxt.lines,
    }));
  },

  persistDraftSoon: () => {
    if (draftTimer) window.clearTimeout(draftTimer);
    draftTimer = window.setTimeout(() => {
      const s = get();
      const payload = JSON.stringify({
        lines: s.lines,
        noteBlocks: s.noteBlocks,
        labels: s.labels,
        markers: s.markers,
        ccLanes: s.ccLanes,
        playheadUs: s.playheadUs,
        internalBpm: s.internalBpm,
      });
      void saveDraftJson(payload);
    }, 600);
  },

  loadDraft: async () => {
    const raw = await loadDraftJson();
    if (!raw) return;
    try {
      const o = JSON.parse(raw) as Partial<AppState>;
      set({
        lines: o.lines ?? [],
        noteBlocks: o.noteBlocks ?? [],
        labels: o.labels ?? [],
        markers: o.markers ?? [],
        ccLanes: o.ccLanes ?? [],
        playheadUs: o.playheadUs ?? 0,
        internalBpm: o.internalBpm ?? 120,
      });
    } catch {
      /* ignore */
    }
  },
}));

export function rowKeysFromBlocks(blocks: NoteBlock[]): RowKey[] {
  const set = new Set<RowKey>();
  for (const b of blocks) set.add(b.rowKey);
  return [...set].sort();
}

export function channelHue(ch: number): string {
  const h = (ch * 47) % 360;
  return `hsl(${h} 70% 55%)`;
}
