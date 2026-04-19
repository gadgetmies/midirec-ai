type ToastItem = { msg: string; id: number };

const bus: ToastItem[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

export function toast(msg: string) {
  bus.push({ msg, id: ++nextId });
  if (bus.length > 6) bus.shift();
  listeners.forEach((l) => l());
}

export function subscribeToasts(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function getToasts(): readonly ToastItem[] {
  return bus;
}
