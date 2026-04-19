import type { NoteBlock } from "@/model/types";
import { rowKeyForNote } from "@/model/types";

export function resolveOverlappingNotes(blocks: NoteBlock[]): NoteBlock[] {
  const byRow = new Map<string, NoteBlock[]>();
  for (const b of blocks) {
    const arr = byRow.get(b.rowKey) ?? [];
    arr.push({ ...b });
    byRow.set(b.rowKey, arr);
  }
  const out: NoteBlock[] = [];
  for (const [, arr] of byRow) {
    arr.sort((a, b) => a.tStartUs - b.tStartUs || a.tEndUs - b.tEndUs);
    for (let i = 0; i < arr.length; i++) {
      const cur = { ...arr[i]! };
      if (i + 1 < arr.length) {
        const nxt = arr[i + 1]!;
        if (nxt.tStartUs < cur.tEndUs) cur.tEndUs = Math.max(cur.tStartUs, nxt.tStartUs);
      }
      if (cur.tEndUs > cur.tStartUs) out.push(cur);
    }
  }
  out.sort((a, b) => a.tStartUs - b.tStartUs);
  return out;
}

export function buildNoteBlocksFromMidiLines(
  lines: { tUs: number; bytes: number[] }[],
): NoteBlock[] {
  const sorted = [...lines].sort((a, b) => a.tUs - b.tUs);
  type Open = { tStart: number; vel: number };
  const open = new Map<string, Open>();
  const blocks: NoteBlock[] = [];
  let id = 0;
  for (const { tUs, bytes } of sorted) {
    const u = new Uint8Array(bytes);
    if (u.length < 2) continue;
    const status = u[0]!;
    if (status < 0x80) continue;
    const hi = status & 0xf0;
    const ch = status & 0x0f;
    if (hi !== 0x90 && hi !== 0x80) continue;
    const note = u[1]!;
    const vel = u[2] ?? 0;
    const key = rowKeyForNote(ch, note);
    const isOn = hi === 0x90 && vel > 0;
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
      open.set(key, { tStart: tUs, vel });
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
  return resolveOverlappingNotes(blocks);
}
