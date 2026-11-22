/**
 * 한국어 번역·요약 배치 (기본: Gemini 무료 티어).
 *   npm run summarize                 # pending 기사 번역·요약 + 요약 없는 저장소 한국어 소개
 *   npm run summarize -- --dry-run    # AI를 부르지 않고 처리 대상만 미리 보기 (DB 키만 필요)
 * AI_SUMMARIZATION_ENABLED=true 와 GEMINI_API_KEY(또는 ANTHROPIC_API_KEY)가 없으면 아무것도 하지 않고 정상 종료한다.
 */
import { resolveProvider, ProviderError } from "../src/lib/ai/provider";
import { hasEnoughContent, hasEnoughRepoDescription, type ValidArticleItem } from "../src/lib/ai/schema";
import { PROMPT_VERSION, processArticleBatch, processGameBatch, processRepoBatch, type ArticleInput, type GameInput, type ItemResult, type RepoInput } from "../src/lib/ai/summarize";
import { getWriteClient } from "./lib/db";
import { intEnv, loadEnv } from "./lib/env";

loadEnv();

const dryRun = process.argv.includes("--dry-run");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const chunk = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

const HINTS: Record<string, string> = {
  PGRST204: "excerpt_ko 열이 없음 → Supabase SQL Editor에서 supabase/migrations/0003_excerpt_translation.sql 실행",
  AUTH: "API 키가 올바르지 않음 → GEMINI_API_KEY(또는 ANTHROPIC_API_KEY) 확인",
  BAD_REQUEST_404: "모델 이름을 찾을 수 없음 → GEMINI_MODEL 값을 확인(비우면 기본값 사용)",
};

async function main() {
  const cfg = resolveProvider();
  if (!cfg && !dryRun) {
    console.log("AI 번역·요약 비활성화 → 건너뜀. 기사는 '요약 대기' 상태로 남습니다.");
    console.log("  무료로 켜려면: .env.local에 AI_SUMMARIZATION_ENABLED=true 와 GEMINI_API_KEY (Google AI Studio에서 무료 발급)");
    console.log("  처리 대상만 미리 보려면: npm run summarize -- --dry-run");
    return;
  }
  const db = getWriteClient();
  if (!db) {
    console.error("✖ Supabase 설정 없음(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)");
    process.exitCode = 1;
    return;
  }
  const limit = intEnv("AI_SUMMARY_BATCH_LIMIT", 40, 200);
  const batchSize = intEnv("AI_BATCH_SIZE", 8, 20);
  const monthlyCap = intEnv("AI_MONTHLY_REQUEST_CAP", 3000, 100_000);

  // 월 상한: 이번 달 AI가 처리한 기사 수
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { count: usedThisMonth } = await db.from("articles").select("id", { count: "exact", head: true }).gte("summarized_at", monthStart);
  const remaining = Math.max(0, monthlyCap - (usedThisMonth ?? 0));

  const { data: rows, error } = await db
    .from("articles")
    .select("id, title, excerpt, original_url, published_at, summary_attempts, sources(name)")
    .eq("summary_status", "pending")
    .order("fetched_at", { ascending: false })
    .limit(dryRun ? 1000 : Math.min(limit, remaining));
  if (error) throw new Error(`DB_SELECT:${error.code}`);

  // shortcut: 저장소는 상태 컬럼 없이 summary_ko(null=미처리, ""=근거 부족)로 관리. 재시도 정책이 복잡해지면 상태 컬럼 추가
  const { data: repos, error: repoError } = await db
    .from("repositories")
    .select("id, full_name, description, language, github_topics")
    .is("summary_ko", null)
    .order("stars_total", { ascending: false })
    .limit(dryRun ? 1000 : limit);
  if (repoError) throw new Error(`DB_SELECT_REPOS:${repoError.code}`);

  // 게임: 한국어 설명이 없는 것만(null=대기). 테이블이 없으면(0006 미적용) 건너뜀
  const { data: gameRows, error: gameError } = await db
    .from("games")
    .select("appid, name, description")
    .is("description_ko", null)
    .order("last_synced_at", { ascending: false })
    .limit(dryRun ? 1000 : limit);
  if (gameError) console.warn(`! games 조회 실패(${gameError.code}) → 게임 설명 번역 건너뜀`);

  const articles = rows ?? [];
  const games = gameRows ?? [];
  const repoRows = repos ?? [];

  if (dryRun) {
    const enough = articles.filter((r) => hasEnoughContent(r.excerpt, r.title)).length;
    const repoReady = repoRows.filter((r) => hasEnoughRepoDescription(r.description)).length;
    console.log("번역·요약 미리보기 (AI 호출·DB 쓰기 없음)");
    console.log(`  기사   대기=${articles.length}  제목·발췌 번역=${articles.length}  요약까지=${enough}  번역만(근거 부족)=${articles.length - enough}`);
    console.log(`  저장소 미처리=${repoRows.length}  한국어 소개 대상=${repoReady}  설명 부족=${repoRows.length - repoReady}`);
    console.log(`  게임   설명 번역 대기=${games.length}`);
    console.log(`  1회 실행: 기사 최대 ${Math.min(limit, remaining)}건 + 저장소 최대 ${limit}건, 요청당 ${batchSize}건씩 묶음 · 이번 달 남은 한도 ${remaining}/${monthlyCap}`);
    console.log(cfg ? `  제공자: ${cfg.name} (${cfg.model}) → npm run summarize 로 실행` : "  제공자 없음: AI_SUMMARIZATION_ENABLED=true 와 GEMINI_API_KEY 필요");
    return;
  }
  if (!cfg) return;

  console.log(`AI translate+summarize provider=${cfg.name} model=${cfg.model} articles=${articles.length} repos=${repoRows.length} games=${games.length} batch=${batchSize}`);
  if (remaining === 0) console.log(`  기사: 월 상한(${monthlyCap}) 도달 → 건너뜀`);

  const inputs: ArticleInput[] = articles.map((r) => ({
    key: r.id,
    title: r.title,
    excerpt: r.excerpt,
    sourceName: (r.sources as unknown as { name: string } | null)?.name ?? "unknown",
    url: r.original_url,
    publishedAt: r.published_at,
  }));
  const attemptsById = new Map(articles.map((r) => [r.id, r.summary_attempts ?? 0]));
  const stats = { completed: 0, translatedOnly: 0, failed: 0, deferred: 0, repos: 0, games: 0 };
  let first = true;
  const pace = async () => {
    if (!first) await sleep(cfg.intervalMs);
    first = false;
  };

  /** 한 묶음을 처리. 영구 오류(인증 등)면 예외를 그대로 올려 전체를 멈춘다 */
  const runArticles = async (batch: ArticleInput[]) => {
    await pace();
    try {
      return await processArticleBatch(cfg, batch);
    } catch (e) {
      if (e instanceof ProviderError && !e.retryable) throw e;
      // 일시 오류가 재시도 후에도 계속되면 이번에는 미루고 다음 실행에서 다시 처리
      return new Map(batch.map((b) => [b.key, { ok: false, code: e instanceof ProviderError ? e.code : "UNKNOWN" } as ItemResult<ValidArticleItem>]));
    }
  };

  const results = new Map<string, ItemResult<ValidArticleItem>>();
  for (const batch of chunk(inputs, batchSize)) for (const [k, v] of await runArticles(batch)) results.set(k, v);
  // 실패한 항목과 요약만 검증에 실패한 항목(예: 문장 수)을 모아 한 번 더
  const needsRetry = (r: ItemResult<ValidArticleItem> | undefined) =>
    !r?.ok || (!r.value.summary && r.value.summaryNote !== "INSUFFICIENT_CONTENT" && r.value.summaryNote !== "MODEL_INSUFFICIENT");
  const retry = inputs.filter((i) => needsRetry(results.get(i.key)));
  // 재시도는 작은 묶음으로: 긴 항목 하나 때문에 묶음 전체가 실패하는 일을 줄인다
  for (const batch of chunk(retry, Math.max(1, Math.floor(batchSize / 4)))) for (const [k, v] of await runArticles(batch)) results.set(k, v);

  const now = new Date().toISOString();
  let trackVersion = true;
  for (const input of inputs) {
    const r = results.get(input.key)!;
    const attempts = (attemptsById.get(input.key) ?? 0) + 1;
    let update: Record<string, unknown>;
    if (r.ok) {
      const v = r.value;
      const base = { title_ko: v.titleKo, excerpt_ko: v.excerptKo, summary_attempts: attempts, summarized_at: now, ...(trackVersion ? { summary_model: `${cfg.name}:${cfg.model}`, summary_prompt_version: PROMPT_VERSION } : {}) };
      if (v.summary) {
        update = { ...base, ...{ summary_ko: v.summary.summaryKo, key_points: v.summary.keyPoints, why_it_matters: v.summary.whyItMatters, use_cases: v.summary.useCases, caveats: v.summary.caveats }, summary_status: "completed", summary_error: null };
        stats.completed++;
      } else if (v.summaryNote === "INSUFFICIENT_CONTENT" || v.summaryNote === "MODEL_INSUFFICIENT") {
        update = { ...base, summary_status: "skipped", summary_error: v.summaryNote };
        stats.translatedOnly++;
      } else {
        // 번역은 됐지만 요약이 검증을 통과하지 못함
        update = { ...base, summary_status: "failed", summary_error: v.summaryNote };
        stats.failed++;
      }
    } else if (attempts < 3) {
      update = { summary_attempts: attempts, summary_error: r.code }; // pending 유지 → 다음 실행에서 재시도
      stats.deferred++;
    } else {
      update = { summary_status: "failed", summary_error: r.code, summary_attempts: attempts, summarized_at: now };
      stats.failed++;
    }
    let { error: upErr } = await db.from("articles").update(update).eq("id", input.key);
    if (upErr?.code === "PGRST204" && trackVersion) {
      // 0008 마이그레이션 전: 모델·프롬프트 버전 열 없이 저장하고 이후로는 보내지 않는다
      console.warn("! summary_model 열 없음 → 0008_summary_provenance.sql 적용 전까지 모델·프롬프트 버전을 기록하지 않습니다");
      trackVersion = false;
      delete update.summary_model;
      delete update.summary_prompt_version;
      ({ error: upErr } = await db.from("articles").update(update).eq("id", input.key));
    }
    if (upErr) throw new Error(`DB_UPDATE:${upErr.code}`);
  }

  const repoInputs: RepoInput[] = [];
  for (const repo of repoRows) {
    if (!hasEnoughRepoDescription(repo.description)) await db.from("repositories").update({ summary_ko: "" }).eq("id", repo.id);
    else repoInputs.push({ key: repo.id, fullName: repo.full_name, description: repo.description!, language: repo.language, topics: repo.github_topics ?? [] });
  }
  for (const batch of chunk(repoInputs, batchSize)) {
    await pace();
    let res: Map<string, ItemResult<string>>;
    try {
      res = await processRepoBatch(cfg, batch);
    } catch (e) {
      if (e instanceof ProviderError && !e.retryable) throw e;
      continue; // 일시 오류: null로 남겨 다음 실행에서 재시도
    }
    for (const [key, r] of res) {
      if (!r.ok) continue;
      await db.from("repositories").update({ summary_ko: r.value }).eq("id", key);
      if (r.value) stats.repos++;
    }
  }

  const gameInputs: GameInput[] = [];
  for (const g of games) {
    if (!g.description) await db.from("games").update({ description_ko: "" }).eq("appid", g.appid);
    else gameInputs.push({ key: String(g.appid), name: g.name, description: g.description });
  }
  for (const batch of chunk(gameInputs, batchSize)) {
    await pace();
    let res: Map<string, ItemResult<string>>;
    try {
      res = await processGameBatch(cfg, batch);
    } catch (e) {
      if (e instanceof ProviderError && !e.retryable) throw e;
      continue; // 일시 오류: null로 남겨 다음 실행에서 재시도
    }
    for (const [key, r] of res) {
      if (!r.ok) continue;
      await db.from("games").update({ description_ko: r.value }).eq("appid", Number(key));
      stats.games++;
    }
  }

  console.log(
    `done 기사: 요약 완료 ${stats.completed} · 번역만 ${stats.translatedOnly} · 실패 ${stats.failed} · 다음에 재시도 ${stats.deferred} / 저장소 한국어 소개 ${stats.repos} / 게임 설명 번역 ${stats.games}`,
  );
}

main().catch((e) => {
  const code = e instanceof ProviderError ? e.code : e instanceof Error ? e.message.slice(0, 80) : "unknown";
  const hint = Object.entries(HINTS).find(([k]) => code.includes(k))?.[1];
  console.error(`✖ summarize aborted ${code}${hint ? `\n  → ${hint}` : ""}`);
  process.exitCode = 1;
});
