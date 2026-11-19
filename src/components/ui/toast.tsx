"use client";

import { CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";

type ToastItem = { id: number; message: string; tone: "success" | "error" };
const EVENT = "issuehub:toast";

export function toast(message: string, tone: ToastItem["tone"] = "success") {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<Omit<ToastItem, "id">>).detail;
      const id = ++seq;
      setItems((prev) => [...prev.slice(-2), { id, message, tone }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2800);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6 md:items-end md:pr-6">
      {items.map((t) => (
        <div key={t.id} className="toast-in pointer-events-auto flex items-center gap-2 rounded-xl border border-line-strong bg-elevated px-4 py-3 text-sm shadow-lg">
          {t.tone === "success" ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <AlertCircle className="size-4 text-danger" aria-hidden />}
          {t.message}
        </div>
      ))}
    </div>
  );
}
