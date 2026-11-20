import { XMLParser } from "fast-xml-parser";
import { normalizeUrl, scoreRelevance, stripHtml, tagTopics, toUtcIso } from "../../src/lib/ingestion/normalize";
import type { NormalizedArticle } from "../../src/lib/ingestion/types";
import { fetchWithRetry } from "../lib/http";

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text", processEntities: true });

const text = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && "#text" in (v as object)) return String((v as Record<string, unknown>)["#text"]);
  return null;
};
const asArray = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** RSS 2.0과 Atom 피드를 공통 형태로. 링크·제목이 없는 항목은 제외 */
export function parseFeed(xml: string, limit: number): NormalizedArticle[] {
  const doc = parser.parse(xml);
  const rssItems = asArray(doc?.rss?.channel?.item);
  const atomEntries = asArray(doc?.feed?.entry);
  const raw = rssItems.length
    ? rssItems.map((i: Record<string, unknown>) => ({
        title: text(i.title),
        link: text(i.link),
        guid: text(i.guid),
        date: text(i.pubDate) ?? text(i["dc:date"]),
        summary: text(i.description),
      }))
    : atomEntries.map((e: Record<string, unknown>) => {
        const links = asArray(e.link as Record<string, string> | Record<string, string>[]);
        const alt = links.find((l) => !l["@_rel"] || l["@_rel"] === "alternate") ?? links[0];
        return { title: text(e.title), link: alt?.["@_href"] ?? null, guid: text(e.id), date: text(e.published) ?? text(e.updated), summary: text(e.summary) };
      });

  const out: NormalizedArticle[] = [];
  for (const r of raw) {
    if (!r.title || !r.link) continue;
    const normalizedUrl = normalizeUrl(r.link);
    if (!normalizedUrl) continue;
    const title = stripHtml(r.title, 300)!;
    const excerpt = stripHtml(r.summary, 600);
    const all = `${title} ${excerpt ?? ""}`;
    out.push({
      sourceItemId: r.guid?.slice(0, 300) ?? null,
      originalUrl: r.link,
      normalizedUrl,
      title,
      excerpt,
      publishedAt: toUtcIso(r.date),
      popularity: null,
      commentsCount: null,
      topics: tagTopics(all),
      relevanceScore: scoreRelevance(all),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function fetchRss(feedUrl: string, limit: number): Promise<NormalizedArticle[]> {
  const res = await fetchWithRetry(feedUrl, { headers: { Accept: "application/rss+xml, application/atom+xml, application/xml" } });
  return parseFeed(await res.text(), limit);
}
