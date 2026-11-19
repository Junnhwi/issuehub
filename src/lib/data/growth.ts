import type { StarGrowth } from "@/types";

export const GROWTH_WINDOW_DAYS = 7;

/**
 * 최신 스냅샷과, 그 이전 GROWTH_WINDOW_DAYS일 안의 가장 오래된 스냅샷의 차이.
 * 서로 다른 날짜의 스냅샷이 2개 이상 없으면 null(=집계 중). DB view repository_feed와 같은 규칙.
 */
export function computeGrowth(snapshots: { capturedDate: string; starsCount: number }[]): StarGrowth | null {
  if (snapshots.length < 2) return null;
  const sorted = [...snapshots].sort((a, b) => a.capturedDate.localeCompare(b.capturedDate));
  const latest = sorted[sorted.length - 1];
  const windowStart = new Date(`${latest.capturedDate}T00:00:00Z`);
  windowStart.setUTCDate(windowStart.getUTCDate() - GROWTH_WINDOW_DAYS);
  const startKey = windowStart.toISOString().slice(0, 10);
  const base = sorted.find((s) => s.capturedDate >= startKey && s.capturedDate < latest.capturedDate);
  if (!base) return null;
  return { delta: latest.starsCount - base.starsCount, fromDate: base.capturedDate, toDate: latest.capturedDate };
}
