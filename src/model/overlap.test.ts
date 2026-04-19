import { describe, expect, it } from "vitest";
import { buildNoteBlocksFromMidiLines, resolveOverlappingNotes } from "@/model/overlap";

describe("buildNoteBlocksFromMidiLines", () => {
  it("pairs note on/off", () => {
    const blocks = buildNoteBlocksFromMidiLines([
      { tUs: 0, bytes: [0x90, 60, 100] },
      { tUs: 500_000, bytes: [0x80, 60, 0] },
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]?.note).toBe(60);
    expect(blocks[0]?.tStartUs).toBe(0);
    expect(blocks[0]?.tEndUs).toBe(500_000);
  });
});

describe("resolveOverlappingNotes", () => {
  it("trims overlap on same row", () => {
    const a = resolveOverlappingNotes([
      {
        id: "1",
        rowKey: "c0-n60",
        channel: 0,
        note: 60,
        tStartUs: 0,
        tEndUs: 100,
        velocity: 100,
      },
      {
        id: "2",
        rowKey: "c0-n60",
        channel: 0,
        note: 60,
        tStartUs: 50,
        tEndUs: 150,
        velocity: 100,
      },
    ]);
    expect(a.some((b) => b.tEndUs <= b.tStartUs)).toBe(false);
  });
});
