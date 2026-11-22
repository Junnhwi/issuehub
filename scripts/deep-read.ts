/**
 * AI 원문 해설(기사)과 README 활용 가이드(저장소)를 만든다. 수집·요약 다음 단계로 매시간 실행.
 *   npm run deep-read              # 최근 3일 기사 중 화제순으로 몇 건 + 저장소 몇 건
 *   npm run deep-read -- --dry-run # AI 호출·DB 쓰기 없이 대상과 본문 추출 결과만 확인
 * 0009 마이그레이션 전이면 아무것도 하지 않고 정상 종료한다.
 * 원문 본문·README는 AI 입력으로만 쓰고 저장하지 않는다.
 */
import { resolveProvider, ProviderError } from "../src/lib/ai/provider";
import { DEEP_READ_PROMPT_VERSION, processDeepRead, processRepoGuide, REPO_GUIDE_PROMPT_VERSION } from "../src/lib/ai/deep-read";
import { SummaryValidationError } from "../src/lib/ai/schema";
import { getWriteClient } from "./lib/db";
import { intEnv, loadEnv } from "./lib/env";
import { readArticle } from "./lib/extract";
import { cleanReadme, fetchReadme } from "./sources/github";

loadEnv();

const dryRun = process.argv.includes("--dry-run");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chunk = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const MAX_ATTEMPTS = 3;

type Status = "completed" | "skipped" | "failed";

async function main() {
  const cfg = resolveProvider();
  if (!cfg && !dryRun) {
    console.log("AI 비활성화 → 원문 해설 건너뜀");
    return;
  }
  const db = getWriteClient();
  if (!db) {
    console.error("✖ Supabase 설정 없음");
    process.exitCode = 1;
    return;
  }
  const probe = await db.from("article_deep_reads").select("article_id").limit(1);
  if (probe.error) {
    console.warn(`! article_deep_reads 없음(${probe.error.code}) → supabase/migrations/0009_ai_deep_reads.sql 적용 전까지 건너뜀`);
    return;
  }
  const articleLimit = intEnv("AI_DEEP_READ_LIMIT", 6, 30);
  const repoLimit = intEnv("AI_REPO_GUIDE_LIMIT", 6, 30);
  const model = cfg ? `${cfg.name}:${cfg.model}` : null;
  let first = true;
  const pace = async () => {
    if (!first && cfg) await sleep(cfg.intervalMs);
    first = false;
  };
  const stats = { articles: { completed: 0, skipped: 0, failed: 0 }, repos: { completed: 0, skipped: 0, failed: 0 } };

  // ---------- 기사: 최근 3일, 아직 해설이 없거나 재시도할 것, 화제순 ----------
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();
  const { data: recent, error } = await db.from("articles").select("id, title, original_url, popularity, fetched_at").gte("fetched_at", since).order("fetched_at", { ascending: false }).limit(300);
  if (error) throw new Error(`DB_SELECT:${error.code}`);
  const done = new Map<string, { status: Status; attempts: number }>();
  for (const ids of chunk((recent ?? []).map((r) => r.id), 100)) {
    const { data } = await db.from("article_deep_reads").select("article_id, status, attempts").in("article_id", ids);
    for (const d of data ?? []) done.set(d.article_id, d);
  }
  const queue = (recent ?? [])
    .filter((r) => {
      const d = done.get(r.id);
      return !d || (d.status === "failed" && d.attempts < MAX_ATTEMPTS);
    })
    .sort((a, b) => (b.popularity ?? -1) - (a.popularity ?? -1) || b.fetched_at.localeCompare(a.fetched_at))
    .slice(0, articleLimit);

  const saveArticle = async (id: string, status: Status, fields: Record<string, unknown>) => {
    stats.articles[status]++;
    if (dryRun) return;
    const attempts = (done.get(id)?.attempts ?? 0) + 1;
    const { error: e } = await db.from("article_deep_reads").upsert({ article_id: id, status, attempts, model, prompt_version: DEEP_READ_PROMPT_VERSION, updated_at: new Date().toISOString(), content: null, error: null, ...fields });
    if (e) throw new Error(`DB_UPSERT:${e.code}`);
  };

  console.log(`AI deep read ${dryRun ? "(dry-run) " : ""}articles=${queue.length}/${recent?.length ?? 0} repos<=${repoLimit}${model ? ` model=${model}` : ""}`);
  for (const a of queue) {
    if (new URL(a.original_url).hostname === "news.ycombinator.com") {
      await saveArticle(a.id, "skipped", { error: "NO_ARTICLE" }); // Ask HN 등 원문 링크가 없는 글
      continue;
    }
    const read = await readArticle(a.original_url);
    if (!read.ok) {
      // 일시적일 수 있는 읽기 실패만 재시도, robots 거부·본문 부족은 다시 시도하지 않는다
      await saveArticle(a.id, read.reason === "FETCH_FAILED" ? "failed" : "skipped", { error: read.reason });
      console.log(`  - ${read.reason.padEnd(15)} ${a.title.slice(0, 60)}`);
      continue;
    }
    if (dryRun || !cfg) {
      console.log(`  + 본문 ${read.chars}자${read.page.imageUrl ? " · 이미지" : ""}  ${a.title.slice(0, 60)}`);
      continue;
    }
    await pace();
    try {
      const content = await processDeepRead(cfg, { title: a.title, url: a.original_url, text: read.page.text });
      await saveArticle(a.id, "completed", { content, image_url: read.page.imageUrl, source_chars: read.chars });
      console.log(`  ✓ ${a.title.slice(0, 60)}`);
    } catch (e) {
      if (e instanceof SummaryValidationError) {
        await saveArticle(a.id, "failed", { error: e.message });
        console.log(`  ✗ ${e.message} ${a.title.slice(0, 50)}`);
      } else if (e instanceof ProviderError && !e.retryable) throw e;
      else console.log(`  … 일시 오류(${e instanceof ProviderError ? e.code : "UNKNOWN"}) → 다음 실행에서 재시도`);
    }
  }

  // ---------- 저장소: Star 많은 순, 아직 가이드가 없거나 재시도할 것 ----------
  const { data: repos, error: repoErr } = await db.from("repositories").select("id, full_name, description").order("stars_total", { ascending: false }).limit(300);
  if (repoErr) throw new Error(`DB_SELECT_REPOS:${repoErr.code}`);
  const guided = new Map<string, { status: Status; attempts: number }>();
  for (const ids of chunk((repos ?? []).map((r) => r.id), 100)) {
    const { data } = await db.from("repo_guides").select("repo_id, status, attempts").in("repo_id", ids);
    for (const d of data ?? []) guided.set(d.repo_id, d);
  }
  const repoQueue = (repos ?? []).filter((r) => {
    const d = guided.get(r.id);
    return !d || (d.status === "failed" && d.attempts < MAX_ATTEMPTS);
  }).slice(0, repoLimit);

  const saveRepo = async (id: string, status: Status, fields: Record<string, unknown>) => {
    stats.repos[status]++;
    if (dryRun) return;
    const attempts = (guided.get(id)?.attempts ?? 0) + 1;
    const { error: e } = await db.from("repo_guides").upsert({ repo_id: id, status, attempts, model, prompt_version: REPO_GUIDE_PROMPT_VERSION, updated_at: new Date().toISOString(), content: null, error: null, ...fields });
    if (e) throw new Error(`DB_UPSERT_REPO:${e.code}`);
  };

  for (const r of repoQueue) {
    const raw = await fetchReadme(r.full_name, process.env.GITHUB_TOKEN);
    const readme = raw ? cleanReadme(raw) : "";
    if (readme.replace(/\s/g, "").length < 300) {
      await saveRepo(r.id, "skipped", { error: raw ? "README_TOO_SHORT" : "NO_README" });
      continue;
    }
    if (dryRun || !cfg) {
      console.log(`  + README ${readme.length}자  ${r.full_name}`);
      continue;
    }
    await pace();
    try {
      const guide = await processRepoGuide(cfg, { fullName: r.full_name, description: r.description, readme });
      if (guide) await saveRepo(r.id, "completed", { content: guide, source_chars: readme.length });
      else await saveRepo(r.id, "skipped", { error: "MODEL_INSUFFICIENT" });
      console.log(`  ${guide ? "✓" : "-"} ${r.full_name}`);
    } catch (e) {
      if (e instanceof SummaryValidationError) await saveRepo(r.id, "failed", { error: e.message });
      else if (e instanceof ProviderError && !e.retryable) throw e;
      else console.log(`  … 일시 오류(${e instanceof ProviderError ? e.code : "UNKNOWN"}) ${r.full_name}`);
    }
  }

  const f = (s: typeof stats.articles) => `완료 ${s.completed} · 건너뜀 ${s.skipped} · 실패 ${s.failed}`;
  console.log(`done 기사 해설: ${f(stats.articles)} / 저장소 가이드: ${f(stats.repos)}`);
}

main().catch((e) => {
  console.error(`✖ deep-read aborted ${e instanceof ProviderError ? e.code : e instanceof Error ? e.message.slice(0, 80) : "unknown"}`);
  process.exitCode = 1;
});
