import type { Article, Page, Repository } from "@/types";
import type { ArticleListParams, RepoListParams } from "@/lib/validation/params";

export const PERIOD_HOURS = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30, all: null } as const;

export function periodStart(period: keyof typeof PERIOD_HOURS, now = Date.now()): string | null {
  const h = PERIOD_HOURS[period];
  return h === null ? null : new Date(now - h * 3600_000).toISOString();
}

const time = (iso: string | null) => (iso ? Date.parse(iso) : 0);
const articleTime = (a: Article) => time(a.publishedAt ?? a.fetchedAt);

function includesQuery(q: string, ...fields: (string | null)[]) {
  const needle = q.toLowerCase();
  return fields.some((f) => f?.toLowerCase().includes(needle));
}

/** null은 항상 뒤로. 동점이면 최신순. */
function byNullableDesc<T>(get: (x: T) => number | null, tiebreak: (x: T) => number) {
  return (a: T, b: T) => {
    const va = get(a), vb = get(b);
    if (va !== vb) {
      if (va === null) return 1;
      if (vb === null) return -1;
      return vb - va;
    }
    return tiebreak(b) - tiebreak(a);
  };
}

export function paginate<T>(items: T[], cursor: string | undefined, limit: number, asOf: string | null): Page<T> {
  const offset = cursor ? Number(cursor) : 0;
  const slice = items.slice(offset, offset + limit);
  const next = offset + limit < items.length ? String(offset + limit) : null;
  return { items: slice, nextCursor: next, total: items.length, asOf };
}

export function filterArticles(items: Article[], p: ArticleListParams, now = Date.now()): Article[] {
  const start = periodStart(p.period, now);
  const out = items.filter(
    (a) =>
      (!p.q || includesQuery(p.q, a.title, a.titleKo, a.excerpt, a.summaryKo)) &&
      (!p.topic || a.topics.includes(p.topic)) &&
      (!p.source || a.source.slug === p.source) &&
      (!p.tier || a.source.tier === p.tier) &&
      (!start || articleTime(a) >= Date.parse(start)),
  );
  if (p.sort === "popular") return out.sort(byNullableDesc((a) => a.popularity, articleTime));
  if (p.sort === "discussed") return out.sort(byNullableDesc((a) => a.commentsCount, articleTime));
  if (p.sort === "relevant") return out.sort(byNullableDesc((a) => a.relevanceScore, articleTime));
  return out.sort((a, b) => articleTime(b) - articleTime(a));
}

export function filterRepos(items: Repository[], p: RepoListParams): Repository[] {
  const out = items.filter(
    (r) =>
      (!p.q || includesQuery(p.q, r.fullName, r.description, r.summaryKo)) &&
      (!p.language || r.language?.toLowerCase() === p.language.toLowerCase()) &&
      (!p.topic || r.topics.includes(p.topic)),
  );
  if (p.sort === "updated") return out.sort((a, b) => time(b.pushedAt) - time(a.pushedAt));
  if (p.sort === "growth") return out.sort(byNullableDesc((r) => r.growth?.delta ?? null, (r) => r.starsTotal));
  return out.sort((a, b) => b.starsTotal - a.starsTotal);
}
