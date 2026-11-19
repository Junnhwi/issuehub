/**
 * 한국어 AI 요약 배치.
 *   npm run summarize                 # pending 기사 + 요약 없는 저장소를 요약 (API 키 필요)
 *   npm run summarize -- --dry-run    # API를 부르지 않고 무엇이 요약/건너뜀 대상인지만 보여 줌 (DB 키만 필요)
 * AI_SUMMARIZATION_ENABLED=true 와 ANTHROPIC_API_KEY가 없으면 아무것도 하지 않고 정상 종료한다(기사는 pending 유지).
 */
import { hasEnoughContent, hasEnoughRepoDescription } from "../src/lib/ai/schema";
import { getWriteClient } from "./lib/db";
import { intEnv, loadEnv } from "./lib/env";

loadEnv();

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const enabled = process.env.AI_SUMMARIZATION_ENABLED === "true" && !!process.env.ANTHROPIC_API_KEY;
  if (!enabled && !dryRun) {
    console.log("AI 요약 비활성화(AI_SUMMARIZATION_ENABLED!=true 또는 ANTHROPIC_API_KEY 없음) → 건너뜀. 기사는 '요약 대기' 상태로 남습니다.");
    console.log("  요약 대상만 미리 보려면: npm run summarize -- --dry-run");
    return;
  }
  const db = getWriteClient();
  if (!db) {
    console.error("✖ Supabase 설정 없음(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)");
    process.exitCode = 1;
    return;
  }
  const batch = intEnv("AI_SUMMARY_BATCH_LIMIT", 10, 50);
  const monthlyCap = intEnv("AI_MONTHLY_REQUEST_CAP", 1000, 100_000);

  // 월 상한: 이번 달 기사 요약 시도(완료+실패) 수
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { count: usedThisMonth } = await db
    .from("articles")
    .select("id", { count: "exact", head: true })
    .gte("summarized_at", monthStart)
    .in("summary_status", ["completed", "failed"]);
  const remaining = Math.max(0, monthlyCap - (usedThisMonth ?? 0));

  const { data: rows, error } = await db
    .from("articles")
    .select("id, title, excerpt, original_url, published_at, summary_attempts, sources(name)")
    .eq("summary_status", "pending")
    .order("fetched_at", { ascending: false })
    .limit(dryRun ? 1000 : Math.min(batch, remaining));
  if (error) throw new Error(`DB_SELECT:${error.code}`);

  // shortcut: 저장소는 상태 컬럼 없이 summary_ko(null=미처리, ""=근거 부족/실패)로 관리. 재시도가 필요해지면 상태 컬럼 추가
  const { data: repos, error: repoError } = await db
    .from("repositories")
    .select("id, full_name, description, language, github_topics")
    .is("summary_ko", null)
    .order("stars_total", { ascending: false })
    .limit(dryRun ? 1000 : batch);
  if (repoError) throw new Error(`DB_SELECT_REPOS:${repoError.code}`);

  if (dryRun) {
    const ready = (rows ?? []).filter((r) => hasEnoughContent(r.excerpt));
    const repoReady = (repos ?? []).filter((r) => hasEnoughRepoDescription(r.description));
    console.log("요약 미리보기 (API 호출·DB 쓰기 없음)");
    console.log(`  기사   pending=${rows?.length ?? 0}  요약 대상=${ready.length}  근거 부족으로 건너뜀=${(rows?.length ?? 0) - ready.length}`);
    console.log(`  저장소 미요약=${repos?.length ?? 0}  요약 대상=${repoReady.length}  설명 부족=${(repos?.length ?? 0) - repoReady.length}`);
    console.log(`  1회 실행 처리량: 기사 최대 ${Math.min(batch, remaining)}건 + 저장소 최대 ${batch}건 · 이번 달 남은 기사 한도 ${remaining}/${monthlyCap}`);
    for (const r of ready.slice(0, 3)) console.log(`    · ${r.title.slice(0, 70)}  (발췌 ${r.excerpt!.length}자)`);
    console.log(enabled ? "  AI 요약 활성화됨: npm run summarize 로 실행" : "  AI 요약 비활성화: .env.local에 AI_SUMMARIZATION_ENABLED=true 와 ANTHROPIC_API_KEY 필요");
    return;
  }

  const { summarizeWithRetry, summarizeRepoWithRetry, DEFAULT_MODEL } = await import("../src/lib/ai/summarize");
  console.log(`AI summarize model=${process.env.ANTHROPIC_MODEL || DEFAULT_MODEL} articles=${rows?.length ?? 0} repos=${repos?.length ?? 0}`);
  if (remaining === 0) console.log(`  기사: 월 요약 상한(${monthlyCap}) 도달 → 건너뜀`);

  const stats = { completed: 0, skipped: 0, failed: 0, repos: 0 };
  let authFailed = false;

  for (const row of rows ?? []) {
    const started = Date.now();
    const now = new Date().toISOString();
    if (!hasEnoughContent(row.excerpt)) {
      await db.from("articles").update({ summary_status: "skipped", summary_error: "INSUFFICIENT_CONTENT" }).eq("id", row.id);
      stats.skipped++;
      console.log(`  - ${row.id} skipped INSUFFICIENT_CONTENT`);
      continue;
    }
    const source = row.sources as unknown as { name: string } | null;
    const result = await summarizeWithRetry({
      title: row.title,
      excerpt: row.excerpt!,
      sourceName: source?.name ?? "unknown",
      url: row.original_url,
      publishedAt: row.published_at,
    });
    const attempts = (row.summary_attempts ?? 0) + 1;
    if (result.kind === "ok") {
      const s = result.summary;
      await db
        .from("articles")
        .update({
          title_ko: s.titleKo,
          summary_ko: s.summaryKo,
          key_points: s.keyPoints,
          why_it_matters: s.whyItMatters,
          use_cases: s.useCases,
          caveats: s.caveats,
          summary_status: "completed",
          summary_error: null,
          summary_attempts: attempts,
          summarized_at: now,
        })
        .eq("id", row.id);
      stats.completed++;
    } else if (result.kind === "insufficient") {
      await db.from("articles").update({ summary_status: "skipped", summary_error: "MODEL_INSUFFICIENT", summary_attempts: attempts }).eq("id", row.id);
      stats.skipped++;
    } else {
      await db
        .from("articles")
        .update({ summary_status: "failed", summary_error: result.code, summary_attempts: attempts, summarized_at: now })
        .eq("id", row.id);
      stats.failed++;
      if (result.code === "AUTH") {
        authFailed = true;
        break;
      }
    }
    console.log(`  - article ${row.id} ${result.kind}${result.kind === "error" ? `:${result.code}` : ""} ${Date.now() - started}ms`);
  }

  for (const repo of authFailed ? [] : (repos ?? [])) {
    const started = Date.now();
    if (!hasEnoughRepoDescription(repo.description)) {
      await db.from("repositories").update({ summary_ko: "" }).eq("id", repo.id);
      continue;
    }
    const result = await summarizeRepoWithRetry({
      fullName: repo.full_name,
      description: repo.description!,
      language: repo.language,
      topics: repo.github_topics ?? [],
    });
    if (result.kind === "error" && result.code === "AUTH") {
      authFailed = true;
      break;
    }
    // 일시 오류는 null로 남겨 다음 실행에서 재시도, 근거 부족·영구 오류는 ""로 표시해 반복 호출을 막는다
    const value = result.kind === "ok" ? result.summary : result.kind === "insufficient" || !result.retryable ? "" : null;
    if (value !== null) await db.from("repositories").update({ summary_ko: value }).eq("id", repo.id);
    if (result.kind === "ok") stats.repos++;
    console.log(`  - repo ${repo.full_name} ${result.kind}${result.kind === "error" ? `:${result.code}` : ""} ${Date.now() - started}ms`);
  }

  if (authFailed) {
    console.error("✖ Anthropic 인증 실패: ANTHROPIC_API_KEY를 확인하세요. 중단합니다.");
    process.exitCode = 1;
  }
  console.log(`done articles completed=${stats.completed} skipped=${stats.skipped} failed=${stats.failed} · repos summarized=${stats.repos}`);
}

main().catch((e) => {
  console.error(`✖ summarize aborted ${e instanceof Error ? e.message.slice(0, 80) : "unknown"}`);
  process.exitCode = 1;
});
