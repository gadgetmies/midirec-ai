export const SCHEMA_V = 1 as const;

export type MidiCategory =
  | "note"
  | "polyAftertouch"
  | "cc"
  | "programChange"
  | "channelPressure"
  | "pitchBend"
  | "realtime"
  | "sysex";

export type RecordFilterMap = Record<MidiCategory, boolean>;

export const defaultRecordFilter = (): RecordFilterMap => ({
  note: true,
  polyAftertouch: true,
  cc: true,
  programChange: true,
  channelPressure: true,
  pitchBend: true,
  realtime: true,
  sysex: true,
});

export type NDJSONMidiLine = {
  v: typeof SCHEMA_V;
  kind: "midi";
  tUs: number;
  bytes: number[];
  deviceId?: string;
  portName?: string;
  manufacturer?: string;
};

export type NDJSONClockLine = {
  v: typeof SCHEMA_V;
  kind: "clock";
  tUs: number;
  clockType: "tick" | "start" | "stop" | "continue" | "spp";
  sppBeats?: number;
};

export type NDJSONMetaLine = {
  v: typeof SCHEMA_V;
  kind: "meta";
  key: string;
  payload: unknown;
};

export type NDJSONLine = NDJSONMidiLine | NDJSONClockLine | NDJSONMetaLine;

export type RowKey = string;

export function rowKeyForNote(channel: number, note: number): RowKey {
  return `c${channel}-n${note}`;
}

export function parseRowKey(key: RowKey): { channel: number; note: number } | null {
  const m = /^c(\d+)-n(\d+)$/.exec(key);
  if (!m) return null;
  return { channel: Number(m[1]), note: Number(m[2]) };
}

export type NoteBlock = {
  id: string;
  rowKey: RowKey;
  channel: number;
  note: number;
  tStartUs: number;
  tEndUs: number;
  velocity: number;
};

export type CcVizMode = "bar" | "line";

export type CcLane = {
  id: string;
  deviceId: string;
  channel: number;
  controller: number;
  viz: CcVizMode;
  points: { tUs: number; value: number }[];
};

export type TimelineLabel = {
  id: string;
  text: string;
  tStartUs: number;
  tEndUs: number;
  rowKeys: RowKey[];
};

export type TimelineMarker = {
  id: string;
  name: string;
  tUs: number;
  color?: string;
};

export type SelectionRect = {
  id: string;
  t0Us: number;
  t1Us: number;
  rowKeys: RowKey[];
};

export type RecordingMode = "appendEnd" | "fromPlayhead";

export type TransportState = {
  isPlaying: boolean;
  playheadUs: number;
  loopAUs: number | null;
  loopBUs: number | null;
  cuePointUs: number | null;
  pausedAfterCue: boolean;
};
