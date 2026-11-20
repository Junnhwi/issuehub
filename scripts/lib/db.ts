import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NormalizedArticle, NormalizedRepo } from "../../src/lib/ingestion/types";

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
  kind: "github" | "hackernews" | "rss";
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
