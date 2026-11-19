import { TOPICS } from "@/config/topics";

const TRACKING_PARAMS = /^(utm_[a-z_]+|fbclid|gclid|mc_cid|mc_eid|ref_src|ref_url)$/i;

/**
 * 중복 판정용 정규화 URL. 추적 파라미터·fragment·기본 포트·끝 슬래시만 제거하고
 * 나머지 쿼리는 정렬해 유지한다(의미 있는 파라미터를 지워 다른 글과 합치지 않도록).
 * 유효한 http(s) URL이 아니면 null.
 */
export function normalizeUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) url.port = "";
  const kept = [...url.searchParams.entries()].filter(([k]) => !TRACKING_PARAMS.test(k)).sort(([a], [b]) => a.localeCompare(b));
  url.search = new URLSearchParams(kept).toString();
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

/** 날짜 입력(ISO, RFC822, unix 초)을 UTC ISO 문자열로. 해석 불가면 null. */
export function toUtcIso(input: string | number | null | undefined): string | null {
  if (input === null || input === undefined || input === "") return null;
  const d = typeof input === "number" ? new Date(input * 1000) : new Date(input);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** 구두점을 공백으로 바꾸고 양끝을 패딩해 단어 경계 매칭을 쉽게 한다 */
function haystack(text: string) {
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}.+#-]+/gu, " ")} `;
}

/** 키워드는 단어 시작에서만 매칭(접두 일치). 끝에 공백이 있으면 단어 전체 일치. */
const matches = (h: string, keyword: string) => h.includes(` ${keyword.trimStart()}`);

/** 등록된 토픽 키워드와 매칭되는 토픽 slug 목록 */
export function tagTopics(text: string): string[] {
  const h = haystack(text);
  return TOPICS.filter((t) => t.keywords.some((k) => matches(h, k))).map((t) => t.slug);
}

/** 연관도 = 매칭된 서로 다른 키워드 수(0~10). 의미를 설명할 수 있는 단순 지표, 매칭 0이면 null */
export function scoreRelevance(text: string): number | null {
  const h = haystack(text);
  const hits = new Set(TOPICS.flatMap((t) => t.keywords.filter((k) => matches(h, k))));
  return hits.size === 0 ? null : Math.min(hits.size, 10);
}

/** HTML 태그·엔티티를 제거한 일반 텍스트, 최대 길이 제한 */
export function stripHtml(input: string | null | undefined, max = 600): string | null {
  if (!input) return null;
  const text = input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
