import { normalizeUrl, scoreRelevance, stripHtml, tagTopics, toUtcIso } from "../../src/lib/ingestion/normalize";
import type { NormalizedArticle } from "../../src/lib/ingestion/types";
import { fetchJson, mapLimit } from "../lib/http";
import { safeFetchText } from "../lib/safe-fetch";

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
  const topics = tagTopics(item.title, excerpt ?? "");
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
    relevanceScore: scoreRelevance(item.title, excerpt ?? ""),
  };
}

/** 원문 페이지의 공개 설명(meta description / og:description)만 읽는다. 본문은 수집하지 않는다. */
export function extractMetaDescription(html: string): string | null {
  const m =
    html.match(/<meta[^>]+(?:property|name)=["'](?:og:description|description)["'][^>]*content=["']([^"']{20,})["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']{20,})["'][^>]*(?:property|name)=["'](?:og:description|description)["']/i);
  return m ? stripHtml(m[1], 400) : null;
}

/** 원문 앞부분(최대 64KB, <head>까지)만 SSRF 검사를 거쳐 읽는다 */
async function fetchMetaDescription(url: string): Promise<string | null> {
  const html = await safeFetchText(url, { maxBytes: 65_536, timeoutMs: 6000, accept: ["text/html", "application/xhtml+xml"], stopAt: "</head>" });
  return html ? extractMetaDescription(html) : null;
}

export async function fetchHackerNews(limit: number): Promise<NormalizedArticle[]> {
  const ids = await fetchJson<number[]>(`${API}/topstories.json`);
  // 관련 없는 글이 걸러지므로 limit의 4배를 후보로 본다
  const items = await mapLimit(ids.slice(0, limit * 4), 8, (id) => fetchJson<HnItem>(`${API}/item/${id}.json`).catch(() => null));
  const normalized = items.map((i) => (i ? normalizeHnItem(i) : null)).filter((a): a is NormalizedArticle => !!a).slice(0, limit);
  return mapLimit(normalized, 4, async (a) => (a.excerpt || !a.originalUrl.startsWith("http") ? a : { ...a, excerpt: await fetchMetaDescription(a.originalUrl) }));
}
