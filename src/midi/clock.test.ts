import { describe, expect, it } from "vitest";
import { musicalPositionFromBeats, clockIntervalMs } from "@/midi/clock";

describe("clock", () => {
  it("computes phrase.bar.beat for 4/4", () => {
    const p = musicalPositionFromBeats(0, 4, 4);
    expect(p.phrase).toBe(1);
    expect(p.bar).toBe(1);
    expect(p.beat).toBe(1);
  });

  it("clock interval at 120 bpm", () => {
    expect(clockIntervalMs(120)).toBeCloseTo(60000 / (120 * 24), 5);
  });
});
