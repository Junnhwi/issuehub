import { tagTopics, toUtcIso } from "../../src/lib/ingestion/normalize";
import type { NormalizedRepo } from "../../src/lib/ingestion/types";
import { fetchWithRetry } from "../lib/http";

/** 토픽 slug → GitHub 검색 쿼리. 최근 30일 내 push된, 일정 수준 이상 Star를 가진 저장소 */
const QUERIES: [string, string][] = [
  ["ai-llm", "topic:llm"],
  ["claude-skills", "claude-code in:name,description,topics"],
  ["mcp-agents", "topic:mcp"],
  ["mcp-agents", "topic:ai-agents"],
  ["frontend", "topic:react"],
  ["backend", "topic:database"],
  ["game-dev", "topic:game-engine"],
];

export interface GithubSearchItem {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  pushed_at: string | null;
  created_at: string | null;
  fork: boolean;
  archived: boolean;
}

export function normalizeGithubItem(item: GithubSearchItem, querySlug: string): NormalizedRepo {
  const githubTopics = (item.topics ?? []).slice(0, 20);
  const text = `${item.full_name} ${item.description ?? ""} ${githubTopics.join(" ")}`;
  return {
    githubId: item.id,
    fullName: item.full_name,
    htmlUrl: item.html_url,
    description: item.description?.slice(0, 500) ?? null,
    language: item.language,
    githubTopics,
    topicSlugs: [...new Set([querySlug, ...tagTopics(text)])],
    stars: item.stargazers_count,
    forks: item.forks_count,
    pushedAt: toUtcIso(item.pushed_at),
    createdAt: toUtcIso(item.created_at),
  };
}

export async function fetchGithubRepos(limit: number, token?: string): Promise<{ repos: NormalizedRepo[]; rateRemaining: number | null }> {
  const since = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const perQuery = Math.max(5, Math.ceil(limit / QUERIES.length));
  const byId = new Map<number, NormalizedRepo>();
  let rateRemaining: number | null = null;

  for (const [slug, q] of QUERIES) {
    const query = `${q} stars:>200 pushed:>${since} archived:false fork:false`;
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${perQuery}`;
    const res = await fetchWithRetry(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    rateRemaining = Number(res.headers.get("x-ratelimit-remaining") ?? NaN);
    const body = (await res.json()) as { items: GithubSearchItem[] };
    for (const item of body.items ?? []) {
      if (item.fork || item.archived) continue;
      const prev = byId.get(item.id);
      const repo = normalizeGithubItem(item, slug);
      byId.set(item.id, prev ? { ...repo, topicSlugs: [...new Set([...prev.topicSlugs, ...repo.topicSlugs])] } : repo);
    }
    // 검색 API rate limit(인증 30회/분, 비인증 10회/분) 보호
    if (Number.isFinite(rateRemaining) && rateRemaining! <= 1) break;
    await new Promise((r) => setTimeout(r, token ? 2100 : 6500));
  }
  return { repos: [...byId.values()], rateRemaining: Number.isFinite(rateRemaining) ? rateRemaining : null };
}

/** README에서 이미지·배지·HTML 주석을 빼고 텍스트만 남긴다(AI 입력용, 저장하지 않음) */
export function cleanReadme(md: string, max = 16_000): string {
  const t = md
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\[!\[[^\]]*\]\([^)]*\)\]\([^)]*\)/g, "") // 링크 달린 배지
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[\]\([^)]*\)/g, "")
    .replace(/<img\b[^>]*>/gi, "")
    .replace(/<\/?(p|div|picture|source|a|br|sup|sub|details|summary)\b[^>]*>/gi, " ")
    .replace(/^\s*\[!\[.*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return t.length > max ? `${t.slice(0, max)}\n…(이하 생략)` : t;
}

/** 공식 GitHub API로 README 원문을 받는다(없으면 null). 토큰이 있으면 시간당 5000회 */
export async function fetchReadme(fullName: string, token?: string): Promise<string | null> {
  if (!/^[\w.-]+\/[\w.-]+$/.test(fullName)) return null;
  try {
    const res = await fetchWithRetry(`https://api.github.com/repos/${fullName}/readme`, {
      headers: {
        Accept: "application/vnd.github.raw+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }, { retries: 1, timeoutMs: 10_000 });
    const text = await res.text();
    return text.length > 2_000_000 ? null : text;
  } catch {
    return null;
  }
}
