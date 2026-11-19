import { describe, expect, it } from "vitest";
import { normalizeUrl, scoreRelevance, stripHtml, tagTopics, toUtcIso } from "@/lib/ingestion/normalize";
import { dedupeArticles, type NormalizedArticle } from "@/lib/ingestion/types";
import { normalizeHnItem, extractMetaDescription } from "../scripts/sources/hackernews";
import { parseFeed } from "../scripts/sources/rss";
import { normalizeGithubItem } from "../scripts/sources/github";

describe("normalizeUrl", () => {
  it("removes tracking params, fragment, default port, trailing slash and lowercases host", () => {
    expect(normalizeUrl("https://Example.COM:443/Post/?utm_source=x&b=2&a=1#top")).toBe("https://example.com/Post?a=1&b=2");
  });
  it("keeps meaningful query params so different articles are not merged", () => {
    expect(normalizeUrl("https://news.ycombinator.com/item?id=1")).not.toBe(normalizeUrl("https://news.ycombinator.com/item?id=2"));
  });
  it("rejects non-http urls", () => {
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("toUtcIso", () => {
  it("parses unix seconds, RFC822 and invalid input", () => {
    expect(toUtcIso(0)).toBe("1970-01-01T00:00:00.000Z");
    expect(toUtcIso("Wed, 19 Nov 2026 09:00:00 +0900")).toBe("2026-11-19T00:00:00.000Z");
    expect(toUtcIso("garbage")).toBeNull();
    expect(toUtcIso(null)).toBeNull();
  });
});

describe("tagTopics / scoreRelevance", () => {
  it("matches keywords at word starts only", () => {
    expect(tagTopics("A rapid prototyping guide")).not.toContain("backend"); // "api" inside "rapid"
    expect(tagTopics("New REST API design")).toContain("backend");
    expect(tagTopics("Building an MCP server for Claude Code")).toEqual(expect.arrayContaining(["claude-skills", "mcp-agents", "ai-llm"]));
  });
  it("returns null relevance when nothing matches", () => {
    expect(scoreRelevance("Gardening tips for autumn")).toBeNull();
    expect(scoreRelevance("React and Next.js with TypeScript")).toBe(3);
  });
});

describe("stripHtml", () => {
  it("removes tags, scripts and decodes entities", () => {
    expect(stripHtml("<p>Hi&nbsp;<b>there</b> &amp; you<script>x()</script></p>")).toBe("Hi there & you");
  });
  it("truncates long text", () => {
    expect(stripHtml("a".repeat(50), 10)).toHaveLength(10);
  });
});

describe("dedupeArticles", () => {
  const base: NormalizedArticle = { sourceItemId: "1", originalUrl: "u", normalizedUrl: "https://x.com/a", title: "t", excerpt: null, publishedAt: null, popularity: 1, topics: [], relevanceScore: null };
  it("keeps one item per normalized url, preferring higher popularity", () => {
    const out = dedupeArticles([base, { ...base, sourceItemId: "2", popularity: 10 }, { ...base, normalizedUrl: "https://x.com/b" }]);
    expect(out).toHaveLength(2);
    expect(out.find((a) => a.normalizedUrl === "https://x.com/a")?.popularity).toBe(10);
  });
});

describe("source adapters (pure parts)", () => {
  it("normalizes HN stories and drops off-topic or dead items", () => {
    const a = normalizeHnItem({ id: 7, type: "story", title: "Show HN: an LLM eval tool", url: "https://ex.com/?utm_campaign=x", score: 42, time: 1_700_000_000 });
    expect(a).toMatchObject({ sourceItemId: "7", normalizedUrl: "https://ex.com/", popularity: 42, topics: ["ai-llm"] });
    expect(normalizeHnItem({ id: 8, type: "story", title: "My garden in spring" })).toBeNull();
    expect(normalizeHnItem({ id: 9, type: "story", title: "LLM", dead: true })).toBeNull();
    expect(normalizeHnItem({ id: 10, type: "comment", title: "LLM" })).toBeNull();
  });
  it("falls back to the HN discussion url for text posts", () => {
    expect(normalizeHnItem({ id: 11, type: "story", title: "Ask HN: Postgres tips?", text: "<p>question</p>" })?.originalUrl).toBe("https://news.ycombinator.com/item?id=11");
  });
  it("extracts meta descriptions in either attribute order", () => {
    expect(extractMetaDescription('<meta name="description" content="A long enough description here.">')).toBe("A long enough description here.");
    expect(extractMetaDescription('<meta content="Another long description text" property="og:description">')).toBe("Another long description text");
    expect(extractMetaDescription("<title>none</title>")).toBeNull();
  });
  it("parses RSS 2.0 and Atom feeds", () => {
    const rss = `<?xml version="1.0"?><rss version="2.0"><channel><item><title>React 20 released</title><link>https://ex.com/r?utm_source=rss</link><guid>g1</guid><pubDate>Wed, 19 Nov 2026 00:00:00 GMT</pubDate><description>&lt;p&gt;New hooks&lt;/p&gt;</description></item><item><title>No link</title></item></channel></rss>`;
    const items = parseFeed(rss, 10);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ title: "React 20 released", normalizedUrl: "https://ex.com/r", excerpt: "New hooks", sourceItemId: "g1", topics: ["frontend"], publishedAt: "2026-11-19T00:00:00.000Z" });
    const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>Godot 5</title><id>tag:1</id><link rel="alternate" href="https://ex.com/g"/><updated>2026-11-01T00:00:00Z</updated><summary>Game engine news</summary></entry></feed>`;
    expect(parseFeed(atom, 10)[0]).toMatchObject({ title: "Godot 5", normalizedUrl: "https://ex.com/g", topics: ["game-dev"] });
  });
  it("normalizes GitHub search items with query topic", () => {
    const r = normalizeGithubItem(
      { id: 1, full_name: "o/r", html_url: "https://github.com/o/r", description: "A React UI kit", language: "TypeScript", topics: ["ui"], stargazers_count: 10, forks_count: 2, pushed_at: "2026-11-01T00:00:00Z", created_at: null, fork: false, archived: false },
      "game-dev",
    );
    expect(r.topicSlugs).toEqual(expect.arrayContaining(["game-dev", "frontend"]));
    expect(r.stars).toBe(10);
  });
});
