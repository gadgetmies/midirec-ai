export function midiSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.requestMIDIAccess;
}

export function stableDeviceId(port: MIDIInput | MIDIOutput): string {
  const id = port.id ?? "";
  const name = port.name ?? "";
  const man = port.manufacturer ?? "";
  const s = `${man}|${name}|${id}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return `d${(h >>> 0).toString(16)}`;
}

export async function requestWebMidi(sysex = true): Promise<MIDIAccess> {
  return navigator.requestMIDIAccess({ sysex });
}
