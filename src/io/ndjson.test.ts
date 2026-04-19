import { describe, expect, it } from "vitest";
import { parseLine, lineToString } from "@/io/ndjson";
import type { NDJSONMidiLine } from "@/model/types";
import { SCHEMA_V } from "@/model/types";

describe("ndjson", () => {
  it("roundtrips line", () => {
    const line: NDJSONMidiLine = {
      v: SCHEMA_V,
      kind: "midi",
      tUs: 10,
      bytes: [0x90, 60, 100],
    };
    const raw = lineToString(line);
    expect(parseLine(raw)).toEqual(line);
  });
});
