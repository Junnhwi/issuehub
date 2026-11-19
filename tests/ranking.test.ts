import { describe, expect, it } from "vitest";
import { computeGrowth } from "@/lib/data/growth";
import { filterArticles, filterRepos, paginate } from "@/lib/data/query";
import { articleListSchema, repoListSchema } from "@/lib/validation/params";
import type { Article, Repository } from "@/types";

describe("computeGrowth (observed star growth)", () => {
  it("returns null with fewer than two snapshots (집계 중)", () => {
    expect(computeGrowth([])).toBeNull();
    expect(computeGrowth([{ capturedDate: "2026-11-19", starsCount: 100 }])).toBeNull();
  });
  it("returns null when snapshots are on the same day only", () => {
    expect(computeGrowth([{ capturedDate: "2026-11-19", starsCount: 100 }, { capturedDate: "2026-11-19", starsCount: 120 }])).toBeNull();
  });
  it("uses the oldest snapshot within the 7-day window before the latest", () => {
    const g = computeGrowth([
      { capturedDate: "2026-11-01", starsCount: 10 }, // window 밖
      { capturedDate: "2026-11-12", starsCount: 50 },
      { capturedDate: "2026-11-15", starsCount: 70 },
      { capturedDate: "2026-11-19", starsCount: 100 },
    ]);
    expect(g).toEqual({ delta: 50, fromDate: "2026-11-12", toDate: "2026-11-19" });
  });
  it("returns null when the only earlier snapshot is older than the window", () => {
    expect(computeGrowth([{ capturedDate: "2026-10-01", starsCount: 1 }, { capturedDate: "2026-11-19", starsCount: 9 }])).toBeNull();
  });
  it("allows negative growth (unstars)", () => {
    expect(computeGrowth([{ capturedDate: "2026-11-18", starsCount: 10 }, { capturedDate: "2026-11-19", starsCount: 8 }])?.delta).toBe(-2);
  });
});

const NOW = Date.parse("2026-11-19T12:00:00Z");
const article = (over: Partial<Article>): Article => ({
  id: "x", title: "t", titleKo: null, excerpt: null, summaryKo: null, keyPoints: [], whyItMatters: null, useCases: [], caveats: null,
  summaryStatus: "pending", originalUrl: "https://ex.com", source: { slug: "hn", name: "HN", kind: "hackernews", tier: "community", homepageUrl: null },
  topics: [], popularity: null, relevanceScore: null, publishedAt: null, fetchedAt: "2026-11-19T00:00:00Z", summarizedAt: null, ...over,
});

describe("filterArticles", () => {
  const items = [
    article({ id: "a", title: "React news", topics: ["frontend"], popularity: 5, relevanceScore: 1, publishedAt: "2026-11-19T10:00:00Z" }),
    article({ id: "b", title: "Postgres", topics: ["backend"], popularity: 50, relevanceScore: null, publishedAt: "2026-11-10T10:00:00Z" }),
    article({ id: "c", title: "LLM", topics: ["ai-llm"], popularity: null, relevanceScore: 3, publishedAt: "2026-11-18T10:00:00Z", source: { slug: "gh", name: "GH", kind: "rss", tier: "official", homepageUrl: null } }),
  ];
  const run = (q: Record<string, string>) => filterArticles(items, articleListSchema.parse(q), NOW).map((a) => a.id);

  it("sorts latest by default", () => expect(run({})).toEqual(["a", "c", "b"]));
  it("sorts popular with nulls last", () => expect(run({ sort: "popular" })).toEqual(["b", "a", "c"]));
  it("sorts relevant with nulls last", () => expect(run({ sort: "relevant" })).toEqual(["c", "a", "b"]));
  it("filters by period", () => expect(run({ period: "24h" })).toEqual(["a"]));
  it("filters by topic, tier and query (case-insensitive)", () => {
    expect(run({ topic: "backend" })).toEqual(["b"]);
    expect(run({ tier: "official" })).toEqual(["c"]);
    expect(run({ q: "react" })).toEqual(["a"]);
  });
});

describe("filterRepos", () => {
  const repo = (over: Partial<Repository>): Repository => ({
    id: "r", githubId: 1, fullName: "o/r", htmlUrl: "", description: null, summaryKo: null, language: "Go", topics: [], githubTopics: [],
    starsTotal: 0, forksTotal: 0, pushedAt: null, repoCreatedAt: null, lastSyncedAt: "", growth: null, isDemo: false, ...over,
  });
  const repos = [
    repo({ id: "1", starsTotal: 100, growth: null }),
    repo({ id: "2", starsTotal: 50, growth: { delta: 30, fromDate: "a", toDate: "b" }, language: "Rust" }),
    repo({ id: "3", starsTotal: 10, growth: { delta: 5, fromDate: "a", toDate: "b" } }),
  ];
  it("growth sort puts uncounted (null) repos last instead of treating them as 0", () => {
    expect(filterRepos(repos, repoListSchema.parse({ sort: "growth" })).map((r) => r.id)).toEqual(["2", "3", "1"]);
  });
  it("filters by language case-insensitively", () => {
    expect(filterRepos(repos, repoListSchema.parse({ language: "rust" })).map((r) => r.id)).toEqual(["2"]);
  });
});

describe("paginate", () => {
  it("returns offset cursors and stops at the end", () => {
    const p1 = paginate([1, 2, 3, 4, 5], undefined, 2, null);
    expect(p1).toMatchObject({ items: [1, 2], nextCursor: "2", total: 5 });
    expect(paginate([1, 2, 3, 4, 5], "4", 2, null)).toMatchObject({ items: [5], nextCursor: null });
  });
});
