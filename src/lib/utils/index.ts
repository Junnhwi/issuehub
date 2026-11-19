export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
export function formatCount(n: number | null | undefined) {
  if (n === null || n === undefined) return "—";
  return n < 1000 ? String(n) : compact.format(n);
}

export function formatSigned(n: number) {
  return `${n > 0 ? "+" : ""}${n.toLocaleString("ko-KR")}`;
}

/** 절대 시각: 기본은 한국 시간대(서버 렌더링), 클라이언트에서는 사용자 로컬 시간대로 다시 그린다 */
export function formatDateTime(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone,
  }).format(new Date(iso));
}

export function formatDate(iso: string, timeZone?: string) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", timeZone }).format(new Date(iso));
}

const rtf = new Intl.RelativeTimeFormat("ko", { numeric: "auto" });
export function formatRelative(iso: string, now = Date.now()) {
  const diff = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "방금 전";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return formatDate(iso);
}

/** 외부 링크 표시용 호스트명 */
export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 마지막 수집이 기준 시간보다 오래되었는지(서버 렌더 시점 기준) */
export function isOlderThan(iso: string, hours: number) {
  return Date.now() - Date.parse(iso) > hours * 3600_000;
}
