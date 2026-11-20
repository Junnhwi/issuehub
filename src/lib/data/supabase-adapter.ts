import "server-only";
import { TOPICS } from "@/config/topics";
import { getReadClient } from "@/lib/db/supabase";
import { sortGames } from "@/lib/games";
import type { Article, Game, GameList, Repository, Source, SourceKind, SourceTier, SummaryStatus } from "@/types";
import type { DataAdapter } from "./types";
import { periodStart } from "./query";

interface ArticleRow {
  id: string;
  source_item_id: string | null;
  original_url: string;
  title: string;
  title_ko: string | null;
  excerpt: string | null;
  excerpt_ko?: string | null;
  summary_ko: string | null;
  key_points: string[] | null;
  why_it_matters: string | null;
  use_cases: string[] | null;
  caveats: string | null;
  summary_status: SummaryStatus;
  relevance_score: number | null;
  popularity: number | null;
  comments_count?: number | null;
  published_at: string | null;
  fetched_at: string;
  summarized_at: string | null;
  source_slug: string;
  source_name: string;
  source_kind: SourceKind;
  source_tier: SourceTier;
  source_homepage_url: string | null;
  topic_slugs: string[];
}

interface RepoRow {
  id: string;
  github_id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  summary_ko: string | null;
  language: string | null;
  github_topics: string[];
  topic_slugs: string[];
  stars_total: number;
  forks_total: number;
  pushed_at: string | null;
  repo_created_at: string | null;
  last_synced_at: string;
  stars_growth: number | null;
  growth_from: string | null;
  growth_to: string | null;
}

interface GameRow {
  appid: number; name: string; store_url: string; header_image: string | null; description: string | null; description_ko: string | null;
  tags: string[]; developers: string[]; release_at: string | null; release_label: string | null; coming_soon: boolean; is_free: boolean;
  price: string | null; discount_pct: number | null; review_label: string | null; review_percent: number | null; review_count: number | null;
  current_players: number | null; peak_players: number | null; ranks: Partial<Record<GameList, number>>; last_synced_at: string;
}

const toGame = (r: GameRow): Game => ({
  appid: r.appid, name: r.name, storeUrl: r.store_url, headerImage: r.header_image, description: r.description,
  descriptionKo: r.description_ko || null, tags: r.tags ?? [], developers: r.developers ?? [], releaseAt: r.release_at,
  releaseLabel: r.release_label, comingSoon: r.coming_soon, isFree: r.is_free, price: r.price, discountPct: r.discount_pct,
  review: r.review_label && r.review_percent !== null && r.review_count ? { label: r.review_label, percent: r.review_percent, count: r.review_count } : null,
  currentPlayers: r.current_players, peakPlayers: r.peak_players, ranks: r.ranks ?? {}, lastSyncedAt: r.last_synced_at, isDemo: false,
});

function hnDiscussion(r: ArticleRow): string | null {
  if (r.source_kind !== "hackernews" || !r.source_item_id) return null;
  const url = `https://news.ycombinator.com/item?id=${encodeURIComponent(r.source_item_id)}`;
  return url === r.original_url ? null : url;
}

function toArticle(r: ArticleRow): Article {
  return {
    id: r.id,
    title: r.title,
    titleKo: r.title_ko,
    excerpt: r.excerpt,
    excerptKo: r.excerpt_ko ?? null, // 0003 마이그레이션 전이면 열이 없어 undefined
    summaryKo: r.summary_ko,
    keyPoints: r.key_points ?? [],
    whyItMatters: r.why_it_matters,
    useCases: r.use_cases ?? [],
    caveats: r.caveats,
    summaryStatus: r.summary_status,
    originalUrl: r.original_url,
    discussionUrl: hnDiscussion(r),
    source: { slug: r.source_slug, name: r.source_name, kind: r.source_kind, tier: r.source_tier, homepageUrl: r.source_homepage_url },
    topics: r.topic_slugs ?? [],
    popularity: r.popularity,
    commentsCount: r.comments_count ?? null,
    relevanceScore: r.relevance_score === null ? null : Number(r.relevance_score),
    publishedAt: r.published_at,
    fetchedAt: r.fetched_at,
    summarizedAt: r.summarized_at,
  };
}

function toRepo(r: RepoRow): Repository {
  return {
    id: r.id,
    githubId: r.github_id,
    fullName: r.full_name,
    htmlUrl: r.html_url,
    description: r.description,
    summaryKo: r.summary_ko || null, // "" = 요약 근거 부족(요약기 표시)
    language: r.language,
    topics: r.topic_slugs ?? [],
    githubTopics: r.github_topics ?? [],
    starsTotal: r.stars_total,
    forksTotal: r.forks_total,
    pushedAt: r.pushed_at,
    repoCreatedAt: r.repo_created_at,
    lastSyncedAt: r.last_synced_at,
    growth:
      r.stars_growth !== null && r.growth_from && r.growth_to
        ? { delta: r.stars_growth, fromDate: r.growth_from, toDate: r.growth_to }
        : null,
    isDemo: false,
  };
}

/** PostgREST or() 문법을 깨뜨릴 수 있는 문자를 제거 */
const sanitize = (q: string) => q.replace(/[,()*%\\"]/g, " ").trim();

function check<T>(res: { data: T; error: { code?: string; message: string } | null }): T {
  if (res.error) throw new Error(`DB_ERROR:${res.error.code ?? "unknown"}`);
  return res.data;
}

async function lastSuccessfulSync(): Promise<string | null> {
  const db = getReadClient();
  const rows = check(
    await db.from("sync_runs").select("finished_at").in("status", ["success", "partial"]).order("finished_at", { ascending: false }).limit(1),
  );
  return rows?.[0]?.finished_at ?? null;
}

const nextCursor = (offset: number, limit: number, count: number | null) =>
  count !== null && offset + limit < count ? String(offset + limit) : null;

export const supabaseAdapter: DataAdapter = {
  async listArticles(p) {
    const db = getReadClient();
    const offset = p.cursor ? Number(p.cursor) : 0;
    let query = db.from("article_feed").select("*", { count: "exact" });
    const s = p.q ? sanitize(p.q) : "";
    if (s) query = query.or(["title", "title_ko", "excerpt", "summary_ko"].map((c) => `${c}.ilike."*${s}*"`).join(","));
    if (p.topic) query = query.contains("topic_slugs", [p.topic]);
    if (p.source) query = query.eq("source_slug", p.source);
    if (p.tier) query = query.eq("source_tier", p.tier);
    const start = periodStart(p.period);
    if (start) query = query.gte("sort_at", start);
    if (p.sort === "popular") query = query.order("popularity", { ascending: false, nullsFirst: false });
    if (p.sort === "discussed") query = query.order("comments_count", { ascending: false, nullsFirst: false });
    if (p.sort === "relevant") query = query.order("relevance_score", { ascending: false, nullsFirst: false });
    query = query.order("sort_at", { ascending: false }).range(offset, offset + p.limit - 1);
    const res = await query;
    const rows = check(res) as ArticleRow[];
    return { items: rows.map(toArticle), nextCursor: nextCursor(offset, p.limit, res.count), total: res.count, asOf: await lastSuccessfulSync() };
  },

  async getArticle(id) {
    const db = getReadClient();
    const row = check(await db.from("article_feed").select("*").eq("id", id).maybeSingle()) as ArticleRow | null;
    if (!row) return null;
    const article = toArticle(row);
    let related: Article[] = [];
    if (article.topics.length) {
      const rows = check(
        await db.from("article_feed").select("*").overlaps("topic_slugs", article.topics).neq("id", id).order("sort_at", { ascending: false }).limit(4),
      ) as ArticleRow[];
      related = rows.map(toArticle);
    }
    return { article, related };
  },

  async listRepos(p) {
    const db = getReadClient();
    const offset = p.cursor ? Number(p.cursor) : 0;
    let query = db.from("repository_feed").select("*", { count: "exact" });
    const s = p.q ? sanitize(p.q) : "";
    if (s) query = query.or(`full_name.ilike."*${s}*",description.ilike."*${s}*"`);
    if (p.language) query = query.ilike("language", sanitize(p.language));
    if (p.topic) query = query.contains("topic_slugs", [p.topic]);
    if (p.sort === "updated") query = query.order("pushed_at", { ascending: false, nullsFirst: false });
    if (p.sort === "growth") query = query.order("stars_growth", { ascending: false, nullsFirst: false });
    query = query.order("stars_total", { ascending: false }).range(offset, offset + p.limit - 1);
    const res = await query;
    const rows = check(res) as RepoRow[];
    return { items: rows.map(toRepo), nextCursor: nextCursor(offset, p.limit, res.count), total: res.count, asOf: await lastSuccessfulSync() };
  },

  async getRepo(id) {
    const db = getReadClient();
    const row = check(await db.from("repository_feed").select("*").eq("id", id).maybeSingle()) as RepoRow | null;
    if (!row) return null;
    const snaps = check(
      await db.from("repo_snapshots").select("captured_date, stars_count").eq("repository_id", id).order("captured_date", { ascending: false }).limit(30),
    ) as { captured_date: string; stars_count: number }[];
    return { repo: toRepo(row), snapshots: snaps.map((x) => ({ capturedDate: x.captured_date, starsCount: x.stars_count })).reverse() };
  },

  async listLanguages() {
    const db = getReadClient();
    // shortcut: 최대 2000개 저장소에서 언어 목록 추출, 저장소가 더 많아지면 distinct view로 교체
    const rows = check(await db.from("repositories").select("language").not("language", "is", null).limit(2000)) as { language: string }[];
    return [...new Set(rows.map((r) => r.language))].sort();
  },

  async listTopics() {
    const db = getReadClient();
    const topicRows = check(await db.from("topics").select("slug, article_topics(count)")) as { slug: string; article_topics: { count: number }[] }[];
    const repoRows = check(await db.from("repositories").select("topic_slugs").limit(2000)) as { topic_slugs: string[] }[];
    return TOPICS.map((t) => ({
      ...t,
      articleCount: topicRows.find((r) => r.slug === t.slug)?.article_topics[0]?.count ?? null,
      repoCount: repoRows.filter((r) => r.topic_slugs.includes(t.slug)).length,
    }));
  },

  async listGames(list) {
    const db = getReadClient();
    const res = await db.from("games").select("*").not(`ranks->${list}`, "is", null).limit(100);
    if (res.error?.code === "PGRST205") return { items: [], asOf: null }; // 0006 미적용: 빈 목록으로 안내
    const rows = check(res) as GameRow[];
    const items = sortGames(rows.map(toGame), list);
    return { items, asOf: items.reduce<string | null>((m, g) => (!m || g.lastSyncedAt > m ? g.lastSyncedAt : m), null) };
  },

  async listSources() {
    const db = getReadClient();
    const rows = check(await db.from("sources").select("id, slug, name, kind, source_tier, homepage_url, feed_url, enabled").eq("enabled", true).order("name")) as {
      id: string; slug: string; name: string; kind: SourceKind; source_tier: SourceTier; homepage_url: string | null; feed_url: string | null; enabled: boolean;
    }[];
    const runs = check(
      await db.from("sync_runs").select("source_id, finished_at").in("status", ["success", "partial"]).order("finished_at", { ascending: false }).limit(200),
    ) as { source_id: string; finished_at: string }[];
    return rows.map<Source>((r) => ({
      id: r.id, slug: r.slug, name: r.name, kind: r.kind, tier: r.source_tier, homepageUrl: r.homepage_url, feedUrl: r.feed_url, enabled: r.enabled,
      lastFetchedAt: runs.find((x) => x.source_id === r.id)?.finished_at ?? null,
    }));
  },

  async getStats() {
    const db = getReadClient();
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const [recent, repos, done, last] = await Promise.all([
      db.from("articles").select("id", { count: "exact", head: true }).gte("fetched_at", since),
      db.from("repositories").select("id", { count: "exact", head: true }),
      db.from("articles").select("id", { count: "exact", head: true }).eq("summary_status", "completed"),
      lastSuccessfulSync(),
    ]);
    for (const r of [recent, repos, done]) if (r.error) throw new Error(`DB_ERROR:${r.error.code ?? "unknown"}`);
    return {
      mode: "live",
      articlesLast24h: recent.count,
      reposTotal: repos.count,
      summariesCompleted: done.count,
      lastSuccessfulSyncAt: last,
      basis: "Supabase DB 실시간 집계 (기사: 최근 24시간 수집 기준)",
    };
  },
};
