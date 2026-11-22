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
  // 문장 끝 마침표("in Rust.")는 떼고, 단어 안의 점(next.js, 16.2)은 남긴다
  return ` ${text.toLowerCase().replace(/[^\p{L}\p{N}.+#-]+/gu, " ").replace(/\.+(?=\s|$)/g, " ")} `;
}

/** 키워드는 단어 시작에서만 매칭(접두 일치). 끝에 공백이 있으면 단어 전체 일치. */
const matches = (h: string, keyword: string) => h.includes(` ${keyword.trimStart()}`);

/**
 * 토픽별 점수. 강한 키워드: 제목 3점·본문 2점, 제목 전용: 제목 2점, 약한 키워드: 제목 1점·본문 0.5점(서로 다른 단어만 센다).
 * 2점 이상이면 그 토픽으로 태깅한다 → 강한 단어 하나, 또는 제목의 범용 단어 2개가 있어야 한다.
 * "FBI agent", "game theory"처럼 범용 단어 하나만 걸린 글은 태깅하지 않는다.
 */
export const TOPIC_THRESHOLD = 2;
export function topicScores(title: string, body = ""): { slug: string; score: number; hits: string[] }[] {
  const ht = haystack(title);
  const hb = haystack(body);
  return TOPICS.map((t) => {
    let score = 0;
    const hits: string[] = [];
    for (const [list, inTitle, inBody] of [[t.keywords, 3, 2], [t.titleKeywords ?? [], 2, 0], [t.weakKeywords ?? [], 1, 0.5]] as const) {
      for (const k of list) {
        const pts = matches(ht, k) ? inTitle : matches(hb, k) ? inBody : 0;
        if (pts) {
          score += pts;
          hits.push(k.trim());
        }
      }
    }
    return { slug: t.slug, score, hits };
  }).filter((r) => r.score >= TOPIC_THRESHOLD);
}

/** 기준을 넘은 토픽 slug 목록(여러 개 가능). body를 생략하면 text 전체를 제목처럼 본다 */
export function tagTopics(title: string, body = ""): string[] {
  return topicScores(title, body).map((r) => r.slug);
}

/** 연관도 = 태깅된 토픽에서 일치한 서로 다른 키워드 수(1~10). 태깅된 토픽이 없으면 null */
export function scoreRelevance(title: string, body = ""): number | null {
  const hits = new Set(topicScores(title, body).flatMap((r) => r.hits));
  return hits.size === 0 ? null : Math.min(hits.size, 10);
}

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
  laquo: "«", raquo: "»", middot: "·", bull: "•", copy: "©", reg: "®", trade: "™", times: "×",
};

const safeCodePoint = (n: number) => (Number.isInteger(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "");

/** HTML 태그·엔티티를 제거한 일반 텍스트, 최대 길이 제한 */
export function stripHtml(input: string | null | undefined, max = 600): string | null {
  if (!input) return null;
  const text = input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    // 일부 사이트는 엔티티를 이중 인코딩(&amp;ndash;)하므로 &amp;를 먼저 푼다
    .replace(/&amp;/g, "&")
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => safeCodePoint(parseInt(h, 16)))
    .replace(/&#(\d{1,7});/g, (_, n) => safeCodePoint(Number(n)))
    .replace(/&([a-z]+);/gi, (m, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
