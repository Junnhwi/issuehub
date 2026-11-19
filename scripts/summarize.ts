/**
 * pending 상태 기사를 배치로 한국어 요약한다.
 *   npm run summarize
 * AI_SUMMARIZATION_ENABLED=true 와 ANTHROPIC_API_KEY가 없으면 아무것도 하지 않고 정상 종료한다(기사는 pending 유지).
 */
import { hasEnoughContent } from "../src/lib/ai/schema";
import { getWriteClient } from "./lib/db";
import { intEnv, loadEnv } from "./lib/env";

loadEnv();

async function main() {
  if (process.env.AI_SUMMARIZATION_ENABLED !== "true" || !process.env.ANTHROPIC_API_KEY) {
    console.log("AI 요약 비활성화(AI_SUMMARIZATION_ENABLED!=true 또는 ANTHROPIC_API_KEY 없음) → 건너뜀. 기사는 '분석 대기' 상태로 남습니다.");
    return;
  }
  const db = getWriteClient();
  if (!db) {
    console.error("✖ Supabase 설정 없음(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY)");
    process.exit(1);
  }
  const { summarizeWithRetry, DEFAULT_MODEL } = await import("../src/lib/ai/summarize");
  const batch = intEnv("AI_SUMMARY_BATCH_LIMIT", 10, 50);
  const monthlyCap = intEnv("AI_MONTHLY_REQUEST_CAP", 1000, 100_000);

  // 월 상한: 이번 달 요약 시도(완료+실패) 수
  const monthStart = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString();
  const { count: usedThisMonth } = await db
    .from("articles")
    .select("id", { count: "exact", head: true })
    .gte("summarized_at", monthStart)
    .in("summary_status", ["completed", "failed"]);
  const remaining = Math.max(0, monthlyCap - (usedThisMonth ?? 0));
  if (remaining === 0) {
    console.log(`월 요약 상한(${monthlyCap}) 도달 → 건너뜀`);
    return;
  }

  const { data: rows, error } = await db
    .from("articles")
    .select("id, title, excerpt, original_url, published_at, summary_attempts, sources(name)")
    .eq("summary_status", "pending")
    .order("fetched_at", { ascending: false })
    .limit(Math.min(batch, remaining));
  if (error) throw new Error(`DB_SELECT:${error.code}`);

  console.log(`AI summarize model=${process.env.ANTHROPIC_MODEL || DEFAULT_MODEL} batch=${rows?.length ?? 0}`);
  const stats = { completed: 0, skipped: 0, failed: 0 };
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
        console.error("✖ Anthropic 인증 실패: ANTHROPIC_API_KEY를 확인하세요. 중단합니다.");
        break;
      }
    }
    console.log(`  - ${row.id} ${result.kind}${result.kind === "error" ? `:${result.code}` : ""} ${Date.now() - started}ms`);
  }
  console.log(`done completed=${stats.completed} skipped=${stats.skipped} failed=${stats.failed}`);
}

main().catch((e) => {
  console.error(`✖ summarize aborted ${e instanceof Error ? e.message.slice(0, 80) : "unknown"}`);
  process.exit(1);
});
