type Props = { open: boolean; onClose: () => void };

export function ShortcutsModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <dialog open className="panel" style={{ position: "fixed", inset: "10%", zIndex: 40, maxWidth: 480 }}>
      <h2 style={{ marginTop: 0 }}>Shortcuts</h2>
      <ul className="muted" style={{ paddingLeft: "1.2rem" }}>
        <li>
          <kbd>Space</kbd> Play / pause
        </li>
        <li>
          <kbd>Home</kbd> / <kbd>End</kbd> Jump to start / end
        </li>
        <li>
          <kbd>⌘</kbd> or middle mouse — pan timeline
        </li>
        <li>
          <kbd>Shift</kbd>+click row — add note
        </li>
        <li>
          <kbd>Alt</kbd>+hover note — delete cursor; click to remove
        </li>
        <li>
          <kbd>⌘</kbd>+<kbd>Z</kbd> / <kbd>⌘</kbd>+<kbd>⇧</kbd>+<kbd>Z</kbd> Undo / redo
        </li>
      </ul>
      <button type="button" className="primary" onClick={onClose}>
        Close
      </button>
    </dialog>
  );
}
