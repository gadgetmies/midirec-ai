import type { MidiData, MidiEvent } from "midi-file";
import { parseMidi, writeMidi } from "midi-file";
import type { NoteBlock } from "@/model/types";
import { rowKeyForNote } from "@/model/types";

function ticksPerQuarter(header: MidiData["header"]): number {
  return header.ticksPerBeat ?? 480;
}

function collectAbsolute(track: MidiEvent[]): { absTick: number; ev: MidiEvent }[] {
  let abs = 0;
  const out: { absTick: number; ev: MidiEvent }[] = [];
  for (const ev of track) {
    abs += ev.deltaTime;
    out.push({ absTick: abs, ev });
  }
  return out;
}

export function noteBlocksFromSmf(buffer: ArrayLike<number>): { blocks: NoteBlock[]; bpm: number } {
  const midi = parseMidi(buffer);
  const tpq = ticksPerQuarter(midi.header);
  let usPerBeat = 500_000;
  const events: { absTick: number; ev: MidiEvent; track: number }[] = [];
  midi.tracks.forEach((tr, trackIdx) => {
    for (const { absTick, ev } of collectAbsolute(tr)) {
      events.push({ absTick, ev, track: trackIdx });
    }
  });
  events.sort((a, b) => a.absTick - b.absTick || a.track - b.track);
  for (const { ev } of events) {
    if (ev.type === "setTempo" && "microsecondsPerBeat" in ev) {
      usPerBeat = ev.microsecondsPerBeat;
    }
  }
  const usPerTick = usPerBeat / tpq;
  type Open = { tStart: number; vel: number; ch: number; note: number };
  const open = new Map<string, Open>();
  const blocks: NoteBlock[] = [];
  let id = 0;
  for (const { absTick, ev } of events) {
    const tUs = Math.round(absTick * usPerTick);
    if (ev.type === "setTempo") continue;
    if (ev.type === "noteOn" || ev.type === "noteOff") {
      const ch = ev.channel;
      const note = ev.noteNumber;
      const vel = ev.velocity;
      const key = rowKeyForNote(ch, note);
      const isOn = ev.type === "noteOn" && vel > 0;
      if (isOn) {
        const prev = open.get(key);
        if (prev) {
          blocks.push({
            id: `nb-${++id}`,
            rowKey: key,
            channel: ch,
            note,
            tStartUs: prev.tStart,
            tEndUs: tUs,
            velocity: prev.vel,
          });
        }
        open.set(key, { tStart: tUs, vel, ch, note });
      } else {
        const prev = open.get(key);
        if (prev) {
          open.delete(key);
          blocks.push({
            id: `nb-${++id}`,
            rowKey: key,
            channel: ch,
            note,
            tStartUs: prev.tStart,
            tEndUs: tUs,
            velocity: prev.vel,
          });
        }
      }
    }
  }
  const bpm = Math.round(60_000_000 / usPerBeat);
  return { blocks, bpm };
}

export function smfBytesFromNoteBlocks(blocks: NoteBlock[], bpm: number): Uint8Array {
  const tpq = 480;
  const usPerBeat = Math.round(60_000_000 / Math.max(1, bpm));
  const usPerTick = usPerBeat / tpq;
  type Timed = { tick: number; ev: MidiEvent };
  const timed: Timed[] = [];
  const sorted = [...blocks].sort((a, b) => a.tStartUs - b.tStartUs || a.tEndUs - b.tEndUs);
  for (const b of sorted) {
    const t0 = Math.round(b.tStartUs / usPerTick);
    const t1 = Math.max(t0 + 1, Math.round(b.tEndUs / usPerTick));
    timed.push({
      tick: t0,
      ev: {
        type: "noteOn",
        deltaTime: 0,
        channel: b.channel,
        noteNumber: b.note,
        velocity: Math.max(1, Math.min(127, b.velocity)),
      },
    });
    timed.push({
      tick: t1,
      ev: {
        type: "noteOff",
        deltaTime: 0,
        channel: b.channel,
        noteNumber: b.note,
        velocity: 0,
      },
    });
  }
  timed.sort((a, b) => a.tick - b.tick);
  const track: MidiEvent[] = [];
  track.push({ type: "trackName", deltaTime: 0, text: "midirec", meta: true });
  track.push({
    type: "setTempo",
    deltaTime: 0,
    microsecondsPerBeat: usPerBeat,
    meta: true,
  });
  let lastTick = 0;
  for (const { tick, ev } of timed) {
    const d = Math.max(0, tick - lastTick);
    lastTick = tick;
    track.push({ ...ev, deltaTime: d });
  }
  track.push({ type: "endOfTrack", deltaTime: 0, meta: true });
  const data: MidiData = {
    header: { format: 0, numTracks: 1, ticksPerBeat: tpq },
    tracks: [track],
  };
  return new Uint8Array(writeMidi(data, { running: true }));
}

export function downloadSmf(filename: string, bytes: Uint8Array) {
  const blob = new Blob([bytes], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".mid") ? filename : `${filename}.mid`;
  a.click();
  URL.revokeObjectURL(url);
}
