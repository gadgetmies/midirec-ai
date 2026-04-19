import type { TimelineLabel, TimelineMarker } from "@/model/types";

export function sortMarkers(m: TimelineMarker[]): TimelineMarker[] {
  return [...m].sort((a, b) => a.tUs - b.tUs);
}

export function sortLabels(l: TimelineLabel[]): TimelineLabel[] {
  return [...l].sort((a, b) => a.tStartUs - b.tStartUs);
}

export function clampLoopToTimeline(
  a: number | null,
  b: number | null,
  endUs: number,
): { a: number | null; b: number | null } {
  if (a == null || b == null) return { a, b };
  const lo = Math.max(0, Math.min(a, b));
  const hi = Math.min(endUs, Math.max(a, b));
  if (hi <= lo) return { a: null, b: null };
  return { a: lo, b: hi };
}
