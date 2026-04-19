import type { MidiCategory, RecordFilterMap } from "@/model/types";

const RT = new Set<number>([0xf8, 0xfa, 0xfb, 0xfc, 0xfe, 0xff]);

export function classifyMidiBytes(data: Uint8Array): MidiCategory | "ignore" {
  if (data.length === 0) return "ignore";
  const b0 = data[0] ?? 0;
  if (b0 === 0xf0 || b0 === 0xf7) return "sysex";
  if (b0 >= 0xf8) return RT.has(b0) ? "realtime" : "ignore";
  const status = b0 < 0x80 ? data[1] ?? b0 : b0;
  const hi = status & 0xf0;
  switch (hi) {
    case 0x80:
    case 0x90:
    case 0xa0:
      return "note";
    case 0xb0:
      return "cc";
    case 0xc0:
      return "programChange";
    case 0xd0:
      return "channelPressure";
    case 0xe0:
      return "pitchBend";
    default:
      return "ignore";
  }
}

export function shouldRecord(
  data: Uint8Array,
  filter: RecordFilterMap,
): boolean {
  const cat = classifyMidiBytes(data);
  if (cat === "ignore") return false;
  if (cat === "note") {
    const status = (data[0] ?? 0) < 0x80 ? (data[1] ?? 0) & 0xf0 : (data[0] ?? 0) & 0xf0;
    if (status === 0x90) {
      const vel = data[data[0] < 0x80 ? 3 : 2] ?? 0;
      if (vel === 0) return filter.note;
    }
    return filter.note;
  }
  return filter[cat];
}

export function isClockRealtimeByte(b0: number): boolean {
  return b0 === 0xf8 || b0 === 0xfa || b0 === 0xfb || b0 === 0xfc;
}

export function clockLineTypeFromByte(b0: number): "tick" | "start" | "stop" | "continue" | null {
  if (b0 === 0xf8) return "tick";
  if (b0 === 0xfa) return "start";
  if (b0 === 0xfb) return "continue";
  if (b0 === 0xfc) return "stop";
  return null;
}
