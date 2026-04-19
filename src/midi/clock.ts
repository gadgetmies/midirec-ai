export type PhraseBarBeat = { phrase: number; bar: number; beat: number };

export function musicalPositionFromBeats(
  totalBeats: number,
  phraseLenBars: number,
  beatsPerBar = 4,
): PhraseBarBeat {
  const barGlobal = Math.floor(totalBeats / beatsPerBar) + 1;
  const beat = (Math.floor(totalBeats) % beatsPerBar) + 1;
  const phrase = Math.floor((barGlobal - 1) / phraseLenBars) + 1;
  const bar = ((barGlobal - 1) % phraseLenBars) + 1;
  return { phrase, bar, beat };
}

export function beatsFromPlayheadUs(playheadUs: number, bpm: number, downbeatOffsetBeats = 0): number {
  const beatDur = 60 / bpm;
  const sec = playheadUs / 1e6;
  return sec / beatDur + downbeatOffsetBeats;
}

export function formatPhraseBarBeat(p: PhraseBarBeat): string {
  return `${p.phrase}.${p.bar}.${p.beat}`;
}

export type ExternalClockState = {
  ticks: number;
  playing: boolean;
};

export function reduceExternalClockByte(
  st: ExternalClockState,
  b0: number,
): ExternalClockState {
  const next = { ...st };
  if (b0 === 0xf8) {
    if (next.playing) next.ticks += 1;
    return next;
  }
  if (b0 === 0xfa || b0 === 0xfb) {
    next.playing = true;
    return next;
  }
  if (b0 === 0xfc) {
    next.playing = false;
    return next;
  }
  return next;
}

export function clockIntervalMs(bpm: number): number {
  return 60_000 / (bpm * 24);
}
