import { useEffect, useState } from "react";
import { getToasts, subscribeToasts } from "@/ui/toast";

export function ToastHost() {
  const [, bump] = useState(0);
  useEffect(() => subscribeToasts(() => bump((x) => x + 1)), []);
  return (
    <div className="toast-host" aria-live="polite">
      {getToasts().map((t) => (
        <div key={t.id} className="toast">
          {t.msg}
        </div>
      ))}
    </div>
  );
}
