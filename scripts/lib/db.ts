import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedArticle, NormalizedRepo } from "../../src/lib/ingestion/types";
import type { NormalizedGame } from "../sources/steam";

/** 수집기 전용 쓰기 클라이언트(secret key). 절대 클라이언트 번들에서 import하지 않는다. */
export function getWriteClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export interface SourceRow {
  id: string;
  slug: string;
  kind: "github" | "hackernews" | "rss" | "steam";
  feed_url: string | null;
}

export async function loadSources(db: SupabaseClient): Promise<SourceRow[]> {
  const { data, error } = await db.from("sources").select("id, slug, kind, feed_url").eq("enabled", true);
  if (error) throw new Error(`DB_SOURCES:${error.code}`);
  return data as SourceRow[];
}

export async function startRun(db: SupabaseClient, sourceId: string): Promise<string | null> {
  const { data } = await db.from("sync_runs").insert({ source_id: sourceId, status: "running" }).select("id").single();
  return data?.id ?? null;
}

export async function finishRun(db: SupabaseClient, runId: string | null, status: "success" | "partial" | "failed", fetched: number, saved: number, errorCode: string | null) {
  if (!runId) return;
  await db.from("sync_runs").update({ status, fetched_count: fetched, saved_count: saved, error_code: errorCode, finished_at: new Date().toISOString() }).eq("id", runId);
}

/**
 * 기사 upsert(normalized_url 기준). 요약 필드·fetched_at·summary_status는 보내지 않으므로
 * 재실행해도 기존 요약과 최초 수집 시각이 유지된다.
 */
export async function upsertArticles(db: SupabaseClient, sourceId: string, items: NormalizedArticle[]): Promise<{ saved: number; failed: number }> {
  const { data: topicRows } = await db.from("topics").select("id, slug");
  const topicId = new Map((topicRows ?? []).map((t: { id: string; slug: string }) => [t.slug, t.id]));
  let saved = 0;
  let failed = 0;
  for (const a of items) {
    const { data, error } = await db
      .from("articles")
      .upsert(
        {
          source_id: sourceId,
          source_item_id: a.sourceItemId,
          normalized_url: a.normalizedUrl,
          original_url: a.originalUrl,
          title: a.title,
          excerpt: a.excerpt,
          popularity: a.popularity,
          comments_count: a.commentsCount,
          relevance_score: a.relevanceScore,
          published_at: a.publishedAt,
        },
        { onConflict: "normalized_url" },
      )
      .select("id")
      .single();
    if (error || !data) {
      failed++;
      console.warn(`  ! article upsert failed item=${a.sourceItemId ?? "-"} code=${error?.code ?? "unknown"}`);
      continue;
    }
    saved++;
    const links = a.topics.filter((s) => topicId.has(s)).map((s) => ({ article_id: data.id, topic_id: topicId.get(s) }));
    if (links.length) await db.from("article_topics").upsert(links, { onConflict: "article_id,topic_id", ignoreDuplicates: true });
  }
  return { saved, failed };
}

/** 저장소 upsert(github_id 기준) + 오늘 날짜(UTC) 스냅샷 기록. 같은 날 재실행 시 스냅샷은 최신 값으로 갱신 */
export async function upsertRepos(db: SupabaseClient, repos: NormalizedRepo[], today = new Date().toISOString().slice(0, 10)) {
  let saved = 0;
  let failed = 0;
  for (const r of repos) {
    const { data, error } = await db
      .from("repositories")
      .upsert(
        {
          github_id: r.githubId,
          full_name: r.fullName,
          html_url: r.htmlUrl,
          description: r.description,
          language: r.language,
          github_topics: r.githubTopics,
          topic_slugs: r.topicSlugs,
          stars_total: r.stars,
          forks_total: r.forks,
          pushed_at: r.pushedAt,
          repo_created_at: r.createdAt,
          last_synced_at: new Date().toISOString(),
        },
        { onConflict: "github_id" },
      )
      .select("id")
      .single();
    if (error || !data) {
      failed++;
      console.warn(`  ! repo upsert failed github_id=${r.githubId} code=${error?.code ?? "unknown"}`);
      continue;
    }
    const snap = await db
      .from("repo_snapshots")
      .upsert({ repository_id: data.id, stars_count: r.stars, captured_date: today }, { onConflict: "repository_id,captured_date" });
    if (snap.error) failed++;
    else saved++;
  }
  return { saved, failed };
}

/**
 * 게임 upsert(appid 기준). 이번 수집에 없는 게임은 목록 순위를 비워 화면에서 빠지게 한다(행은 남김).
 * description_ko는 원문이 한국어일 때만 보낸다. 아니면 기존 번역을 덮어쓰지 않는다.
 */
export async function upsertGames(db: SupabaseClient, games: NormalizedGame[]): Promise<{ saved: number; failed: number }> {
  let saved = 0;
  let failed = 0;
  const now = new Date().toISOString();
  for (const g of games) {
    const row: Record<string, unknown> = {
      appid: g.appid, name: g.name, store_url: g.storeUrl, header_image: g.headerImage, description: g.description,
      tags: g.tags, developers: g.developers, release_at: g.releaseAt, release_label: g.releaseLabel, coming_soon: g.comingSoon,
      is_free: g.isFree, price: g.price, discount_pct: g.discountPct, review_label: g.reviewLabel, review_percent: g.reviewPercent,
      review_count: g.reviewCount, current_players: g.currentPlayers, peak_players: g.peakPlayers, ranks: g.ranks, last_synced_at: now,
    };
    if (g.descriptionKo) row.description_ko = g.descriptionKo;
    const { error } = await db.from("games").upsert(row, { onConflict: "appid" });
    if (error) {
      failed++;
      console.warn(`  ! game upsert failed appid=${g.appid} code=${error.code}`);
    } else saved++;
  }
  if (games.length) {
    const { error } = await db.from("games").update({ ranks: {} }).not("appid", "in", `(${games.map((g) => g.appid).join(",")})`);
    if (error) console.warn(`  ! game rank reset failed code=${error.code}`);
  }
  return { saved, failed };
}
