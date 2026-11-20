"use client";

import { useSyncExternalStore } from "react";
import { formatClock, formatDateTime, formatRelative } from "@/lib/utils";

const noop = () => () => {};

/**
 * 서버에서는 한국 시간대로 렌더링하고, 브라우저에서 사용자 로컬 시간대 기준으로 다시 그린다.
 * DB/API 값은 항상 UTC ISO. clock: "13시 24분 (56분 전)"
 */
export function LocalTime({ iso, mode = "relative", className }: { iso: string; mode?: "relative" | "absolute" | "clock"; className?: string }) {
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  const absolute = formatDateTime(iso, isClient ? undefined : "Asia/Seoul");
  return (
    <time dateTime={iso} title={absolute} className={className} suppressHydrationWarning>
      {mode === "relative" ? formatRelative(iso) : mode === "clock" ? `${formatClock(iso, isClient ? undefined : "Asia/Seoul")} (${formatRelative(iso)})` : absolute}
    </time>
  );
}
