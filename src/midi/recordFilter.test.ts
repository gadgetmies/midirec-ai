import { describe, expect, it } from "vitest";
import { classifyMidiBytes, shouldRecord } from "@/midi/recordFilter";
import { defaultRecordFilter } from "@/model/types";

describe("recordFilter", () => {
  it("classifies note on", () => {
    expect(classifyMidiBytes(new Uint8Array([0x90, 60, 100]))).toBe("note");
  });

  it("respects CC filter off", () => {
    const f = { ...defaultRecordFilter(), cc: false };
    expect(shouldRecord(new Uint8Array([0xb0, 1, 2]), f)).toBe(false);
  });
});
