/**
 * IssueHub 수집 진입점.
 *   npm run ingest            # DB에 저장 (Supabase secret key 필요)
 *   npm run ingest:dry        # 외부 API만 호출하고 저장하지 않음 (키 불필요)
 *   npm run ingest -- --source=hackernews
 * 실패한 소스가 있어도 다른 소스는 계속 진행하고, 기존 데이터는 삭제하지 않는다.
 */
import { dedupeArticles, type NormalizedArticle } from "../src/lib/ingestion/types";
import { finishRun, getWriteClient, loadSources, startRun, upsertArticles, upsertRepos, type SourceRow } from "./lib/db";
import { intEnv, loadEnv } from "./lib/env";
import { errorCode } from "./lib/http";
import { fetchGithubRepos } from "./sources/github";
import { fetchHackerNews } from "./sources/hackernews";
import { fetchRss } from "./sources/rss";

loadEnv();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const only = args.find((a) => a.startsWith("--source="))?.split("=")[1];
const limit = intEnv("INGEST_BATCH_LIMIT", 30, 100);

/** DB 없이 dry-run 할 때 쓰는 기본 소스 목록(마이그레이션 seed와 동일) */
const DEFAULT_SOURCES: SourceRow[] = [
  { id: "-", slug: "github", kind: "github", feed_url: null },
  { id: "-", slug: "hackernews", kind: "hackernews", feed_url: null },
  { id: "-", slug: "github-blog", kind: "rss", feed_url: "https://github.blog/feed/" },
  { id: "-", slug: "nextjs-blog", kind: "rss", feed_url: "https://nextjs.org/feed.xml" },
  { id: "-", slug: "cloudflare-blog", kind: "rss", feed_url: "https://blog.cloudflare.com/rss/" },
];

function sample(items: NormalizedArticle[]) {
  for (const a of items.slice(0, 3)) console.log(`    - ${a.title.slice(0, 80)} [${a.topics.join(",") || "no-topic"}]${a.excerpt ? "" : " (excerpt 없음)"}`);
}

async function main() {
  const db = dryRun ? null : getWriteClient();
  if (!dryRun && !db) {
    console.error(
      "✖ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY가 설정되지 않았습니다.\n" +
        "  로컬: .env.local에 값을 넣으세요. GitHub Actions: 저장소 Settings → Secrets에 등록하세요.\n" +
        "  키 없이 수집 결과만 확인하려면: npm run ingest:dry",
    );
    process.exit(1);
  }
  if (!process.env.GITHUB_TOKEN) console.warn("! GITHUB_TOKEN 없음: 비인증 GitHub Search API는 분당 10회로 제한됩니다.");

  const sources = (db ? await loadSources(db) : DEFAULT_SOURCES).filter((s) => !only || s.slug === only);
  console.log(`IssueHub ingest ${dryRun ? "(dry-run)" : ""} sources=${sources.map((s) => s.slug).join(",")} limit=${limit}`);
  let failures = 0;

  for (const source of sources) {
    const started = Date.now();
    const runId = db ? await startRun(db, source.id) : null;
    try {
      if (source.kind === "github") {
        const { repos, rateRemaining } = await fetchGithubRepos(limit, process.env.GITHUB_TOKEN || undefined);
        const res = db ? await upsertRepos(db, repos) : { saved: 0, failed: 0 };
        if (db) await finishRun(db, runId, res.failed ? "partial" : "success", repos.length, res.saved, res.failed ? "PARTIAL_UPSERT" : null);
        console.log(`✓ ${source.slug} fetched=${repos.length} saved=${res.saved} failed=${res.failed} rateRemaining=${rateRemaining ?? "?"} ${Date.now() - started}ms`);
        if (dryRun) for (const r of repos.slice(0, 3)) console.log(`    - ${r.fullName} ★${r.stars} [${r.topicSlugs.join(",")}]`);
        continue;
      }
      const raw =
        source.kind === "hackernews" ? await fetchHackerNews(limit) : source.feed_url ? await fetchRss(source.feed_url, limit) : [];
      const items = dedupeArticles(raw);
      const res = db ? await upsertArticles(db, source.id, items) : { saved: 0, failed: 0 };
      if (db) await finishRun(db, runId, res.failed ? "partial" : "success", items.length, res.saved, res.failed ? "PARTIAL_UPSERT" : null);
      console.log(`✓ ${source.slug} fetched=${items.length} saved=${res.saved} failed=${res.failed} ${Date.now() - started}ms`);
      if (dryRun) sample(items);
    } catch (e) {
      failures++;
      const code = errorCode(e);
      if (db) await finishRun(db, runId, "failed", 0, 0, code);
      console.error(`✖ ${source.slug} error=${code} ${Date.now() - started}ms`);
    }
  }
  if (failures === sources.length && sources.length > 0) process.exit(1);
}

main().catch((e) => {
  console.error(`✖ ingest aborted error=${errorCode(e)}`);
  process.exit(1);
});
