import type { NDJSONClockLine, NDJSONLine, NDJSONMidiLine } from "@/model/types";
import { SCHEMA_V } from "@/model/types";
import type { RecordFilterMap } from "@/model/types";
import {
  clockLineTypeFromByte,
  isClockRealtimeByte,
  shouldRecord,
} from "@/midi/recordFilter";
import { stableDeviceId } from "@/midi/webmidi";

export function clockLineFromByte(tUs: number, b0: number): NDJSONClockLine | null {
  const t = clockLineTypeFromByte(b0);
  if (!t) return null;
  return { v: SCHEMA_V, kind: "clock", tUs, clockType: t };
}

export function midiLineFromMessage(
  ev: MIDIMessageEvent,
  tUs: number,
): NDJSONMidiLine {
  const data = ev.data!;
  const port = ev.target as MIDIInput;
  return {
    v: SCHEMA_V,
    kind: "midi",
    tUs,
    bytes: Array.from(data),
    deviceId: stableDeviceId(port),
    portName: port.name ?? undefined,
    manufacturer: port.manufacturer ?? undefined,
  };
}

export function lineFromMidiMessage(
  ev: MIDIMessageEvent,
  tUs: number,
  filter: RecordFilterMap,
): NDJSONLine | null {
  const data = ev.data!;
  if (data.length === 0) return null;
  const b0 = data[0]!;
  if (isClockRealtimeByte(b0)) {
    if (!filter.realtime) return null;
    return clockLineFromByte(tUs, b0);
  }
  if (!shouldRecord(data, filter)) return null;
  return midiLineFromMessage(ev, tUs);
}
