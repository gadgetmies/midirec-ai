import type { NDJSONLine } from "@/model/types";
import { SCHEMA_V } from "@/model/types";

export function lineToString(line: NDJSONLine): string {
  return JSON.stringify(line);
}

export function parseLine(raw: string): NDJSONLine | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    const o = JSON.parse(t) as NDJSONLine;
    if (o && o.v === SCHEMA_V) return o;
    return null;
  } catch {
    return null;
  }
}

export function exportNdjsonBlob(lines: NDJSONLine[]): Blob {
  const text = lines.map(lineToString).join("\n") + (lines.length ? "\n" : "");
  return new Blob([text], { type: "application/x-ndjson" });
}

export function downloadNdjson(filename: string, lines: NDJSONLine[]) {
  const blob = exportNdjsonBlob(lines);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ndjson") ? filename : `${filename}.ndjson`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function readNdjsonFile(file: File): Promise<NDJSONLine[]> {
  const text = await file.text();
  const out: NDJSONLine[] = [];
  for (const line of text.split("\n")) {
    const p = parseLine(line);
    if (p) out.push(p);
  }
  return out;
}

export function filterLinesForSelection(
  lines: NDJSONLine[],
  t0Us: number,
  t1Us: number,
): NDJSONLine[] {
  const lo = Math.min(t0Us, t1Us);
  const hi = Math.max(t0Us, t1Us);
  return lines.filter((l) => {
    if (!("tUs" in l)) return true;
    return l.tUs >= lo && l.tUs <= hi;
  });
}
