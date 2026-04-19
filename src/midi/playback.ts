import type { NoteBlock } from "@/model/types";

export type ScheduledNote = { tPerf: number; bytes: Uint8Array; port: MIDIOutput };

export function scheduleNoteBlocks(
  blocks: NoteBlock[],
  outputs: MIDIOutput[],
  t0Us: number,
  originPerf: number,
): void {
  if (!outputs.length) return;
  for (const b of blocks) {
    const dtOn = (b.tStartUs - t0Us) / 1e3;
    const dtOff = (b.tEndUs - t0Us) / 1e3;
    const tOn = originPerf + dtOn;
    const tOff = originPerf + dtOff;
    const on = new Uint8Array([0x90 | (b.channel & 0x0f), b.note & 0x7f, b.velocity & 0x7f]);
    const off = new Uint8Array([0x80 | (b.channel & 0x0f), b.note & 0x7f, 0]);
    for (const port of outputs) {
      try {
        port.send(on, tOn);
        port.send(off, tOff);
      } catch {
        port.send(on);
        port.send(off);
      }
    }
  }
}
