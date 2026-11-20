import { normalizeUrl, scoreRelevance, stripHtml, tagTopics, toUtcIso } from "../../src/lib/ingestion/normalize";
import type { NormalizedArticle } from "../../src/lib/ingestion/types";
import { fetchJson, fetchWithRetry, mapLimit } from "../lib/http";

const API = "https://hacker-news.firebaseio.com/v0";

export interface HnItem {
  id: number;
  type?: string;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  descendants?: number;
  time?: number;
  dead?: boolean;
  deleted?: boolean;
}

/** 개발 토픽과 관련 없는 글(태그 0개)과 삭제된 글은 제외 */
export function normalizeHnItem(item: HnItem): NormalizedArticle | null {
  if (!item || item.type !== "story" || item.dead || item.deleted || !item.title) return null;
  const discussion = `https://news.ycombinator.com/item?id=${item.id}`;
  const originalUrl = item.url ?? discussion;
  const normalizedUrl = normalizeUrl(originalUrl);
  if (!normalizedUrl) return null;
  const excerpt = stripHtml(item.text);
  const text = `${item.title} ${excerpt ?? ""}`;
  const topics = tagTopics(text);
  if (topics.length === 0) return null;
  return {
    sourceItemId: String(item.id),
    originalUrl,
    normalizedUrl,
    title: item.title.slice(0, 300),
    excerpt,
    publishedAt: toUtcIso(item.time ?? null),
    popularity: item.score ?? null,
    commentsCount: item.descendants ?? null,
    topics,
    relevanceScore: scoreRelevance(text),
  };
}

/** 원문 페이지의 공개 설명(meta description / og:description)만 읽는다. 본문은 수집하지 않는다. */
export function extractMetaDescription(html: string): string | null {
  const m =
    html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]*content=["']([^"']{20,})["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']{20,})["'][^>]*(?:property|name)=["'](?:og:description|description)["']/i);
  return m ? stripHtml(m[1], 400) : null;
}

async function fetchMetaDescription(url: string): Promise<string | null> {
  try {
    const res = await fetchWithRetry(url, { headers: { Accept: "text/html" } }, { retries: 0, timeoutMs: 6000 });
    if (!res.headers.get("content-type")?.includes("text/html") || !res.body) return null;
    // 앞부분 64KB만 읽는다(<head> 메타데이터용)
    const reader = res.body.getReader();
    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 65536) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes("</head>")) break;
    }
    await reader.cancel().catch(() => {});
    return extractMetaDescription(html);
  } catch {
    return null;
  }
}

export async function fetchHackerNews(limit: number): Promise<NormalizedArticle[]> {
  const ids = await fetchJson<number[]>(`${API}/topstories.json`);
  // 관련 없는 글이 걸러지므로 limit의 4배를 후보로 본다
  const items = await mapLimit(ids.slice(0, limit * 4), 8, (id) => fetchJson<HnItem>(`${API}/item/${id}.json`).catch(() => null));
  const normalized = items.map((i) => (i ? normalizeHnItem(i) : null)).filter((a): a is NormalizedArticle => !!a).slice(0, limit);
  return mapLimit(normalized, 4, async (a) => (a.excerpt || !a.originalUrl.startsWith("http") ? a : { ...a, excerpt: await fetchMetaDescription(a.originalUrl) }));
}
