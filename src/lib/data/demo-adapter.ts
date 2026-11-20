import { TOPICS } from "@/config/topics";
import type { DataAdapter } from "./types";
import { sortGames } from "@/lib/games";
import { DEMO_ARTICLES, DEMO_GAMES, DEMO_LAST_SYNC, DEMO_REPOS, DEMO_SNAPSHOTS, DEMO_SOURCES } from "./demo-data";
import { filterArticles, filterRepos, paginate } from "./query";

export const demoAdapter: DataAdapter = {
  async listArticles(p) {
    return paginate(filterArticles(DEMO_ARTICLES, p), p.cursor, p.limit, DEMO_LAST_SYNC);
  },
  async getArticle(id) {
    const article = DEMO_ARTICLES.find((a) => a.id === id);
    if (!article) return null;
    const related = DEMO_ARTICLES.filter((a) => a.id !== id && a.topics.some((t) => article.topics.includes(t))).slice(0, 4);
    return { article, related };
  },
  async listRepos(p) {
    return paginate(filterRepos(DEMO_REPOS, p), p.cursor, p.limit, DEMO_LAST_SYNC);
  },
  async getRepo(id) {
    const repo = DEMO_REPOS.find((r) => r.id === id);
    return repo ? { repo, snapshots: DEMO_SNAPSHOTS[id] ?? [] } : null;
  },
  async listLanguages() {
    return [...new Set(DEMO_REPOS.map((r) => r.language).filter((l): l is string => !!l))].sort();
  },
  async listTopics() {
    return TOPICS.map((t) => ({
      ...t,
      articleCount: DEMO_ARTICLES.filter((a) => a.topics.includes(t.slug)).length,
      repoCount: DEMO_REPOS.filter((r) => r.topics.includes(t.slug)).length,
    }));
  },
  async listSources() {
    return DEMO_SOURCES;
  },
  async listGames(list) {
    return { items: sortGames(DEMO_GAMES, list), asOf: DEMO_LAST_SYNC };
  },
  async getStats() {
    const since = Date.now() - 24 * 3600_000;
    return {
      mode: "demo",
      articlesLast24h: DEMO_ARTICLES.filter((a) => Date.parse(a.fetchedAt) >= since).length,
      reposTotal: DEMO_REPOS.length,
      summariesCompleted: DEMO_ARTICLES.filter((a) => a.summaryStatus === "completed").length,
      lastSuccessfulSyncAt: DEMO_LAST_SYNC,
      basis: "데모 데이터 기준 집계(실제 수집 결과 아님)",
    };
  },
};
