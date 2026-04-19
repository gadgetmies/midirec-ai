export type SnapDivision = "1" | "1/2" | "1/4" | "1/8" | "1/16" | "1/32";

export function beatDurationUs(bpm: number): number {
  return (60_000_000 / bpm) | 0;
}

export function snapTimeUs(
  tUs: number,
  bpm: number,
  division: SnapDivision,
  bypass: boolean,
): number {
  if (bypass) return tUs;
  const beat = beatDurationUs(bpm);
  const denom: Record<SnapDivision, number> = {
    "1": 1,
    "1/2": 2,
    "1/4": 4,
    "1/8": 8,
    "1/16": 16,
    "1/32": 32,
  };
  const step = Math.max(1, Math.floor(beat / denom[division]));
  return Math.round(tUs / step) * step;
}
