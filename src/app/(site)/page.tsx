import { Activity, ArrowRight, CheckCircle2, Clock, FileText, FolderGit2, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { getData } from "@/lib/data";
import { formatCount, isOlderThan } from "@/lib/utils";
import { ArticleCard } from "@/components/articles/article-card";
import { TierBadge } from "@/components/articles/badges";
import { RepoCard } from "@/components/github/repo-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { SectionTitle } from "@/components/ui/page-header";
import type { Stats } from "@/types";

export const dynamic = "force-dynamic";

function Kpi({ icon: Icon, label, value, hint }: { icon: typeof FileText; label: string; value: number | null; hint: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 md:p-5">
      <div className="flex items-center gap-2 text-[13px] font-medium text-muted">
        <Icon className="size-4" aria-hidden />
        {label}
      </div>
      <p className="tabular mt-2 text-[28px] font-bold leading-none tracking-tight" aria-describedby={`${label}-hint`}>
        {value === null ? <span className="text-muted">—</span> : value.toLocaleString("ko-KR")}
      </p>
      <p id={`${label}-hint`} className="mt-2 text-xs text-muted">
        {value === null ? "아직 집계되지 않았습니다" : hint}
      </p>
    </div>
  );
}

function SyncStatus({ stats }: { stats: Stats }) {
  const last = stats.lastSuccessfulSyncAt;
  const stale = last ? isOlderThan(last, 13) : true;
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[13px] text-fg-2">
      {last && !stale ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <TriangleAlert className="size-4 text-warning" aria-hidden />}
      {last ? (
        <span>
          마지막 성공 수집 <LocalTime iso={last} className="font-medium text-fg" />
          {stale && " · 지연됨"}
        </span>
      ) : (
        <span>아직 성공한 수집 기록이 없습니다</span>
      )}
      {stats.mode === "demo" && <span className="text-warning">(데모)</span>}
    </div>
  );
}

export default async function DashboardPage() {
  const data = getData();
  const [stats, popular, latest, repos, topics, sources] = await Promise.all([
    data.getStats(),
    data.listArticles({ period: "7d", sort: "popular", limit: 3 }),
    data.listArticles({ period: "all", sort: "latest", limit: 10 }),
    data.listRepos({ sort: "growth", limit: 5 }),
    data.listTopics(),
    data.listSources(),
  ]);
  const [featured, ...others] = popular.items;
  const topTopics = [...topics].sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Hero */}
      <section aria-labelledby="hero-title" className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent-fg">
            <Activity className="size-3.5" aria-hidden />
            Overview
          </p>
          <h1 id="hero-title" className="text-[28px] font-bold md:text-[34px]">
            기술의 흐름을 한눈에.
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-muted">
            개발 커뮤니티와 공식 출처의 새 소식, GitHub 주목 저장소를 모아 출처와 함께 보여 줍니다. 요약은 원문 정보에 근거해서만 만듭니다.
          </p>
        </div>
        <SyncStatus stats={stats} />
      </section>

      {/* KPI */}
      <section aria-label="주요 지표" className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={FileText} label="최근 24시간 수집 기사" value={stats.articlesLast24h} hint={stats.basis} />
        <Kpi icon={FolderGit2} label="수집 저장소" value={stats.reposTotal} hint="스타 스냅샷을 추적 중인 저장소" />
        <Kpi icon={Sparkles} label="요약 완료" value={stats.summariesCompleted} hint={stats.mode === "demo" ? "데모: 예시 요약 수(AI 생성 아님)" : "AI 요약이 검증을 통과한 기사"} />
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-8 md:space-y-10">
          {/* 주요 이슈 */}
          <section aria-labelledby="top-title">
            <SectionTitle
              id="top-title"
              title="주요 이슈"
              action={<span className="text-xs text-muted">최근 7일 · 출처 인기 지표 순</span>}
            />
            {featured ? (
              <div className="grid gap-3 lg:grid-cols-2">
                <ArticleCard article={featured} variant="featured" />
                <div className="grid gap-3">
                  {others.map((a) => (
                    <ArticleCard key={a.id} article={a} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="최근 7일간 수집된 이슈가 없습니다" description="수집기가 실행되면 이곳에 표시됩니다." />
            )}
          </section>

          {/* 최신 이슈 */}
          <section aria-labelledby="latest-title">
            <SectionTitle
              id="latest-title"
              title="최신 이슈"
              action={
                <Link href="/discover" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-fg hover:underline">
                  모두 보기 <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              }
            />
            {latest.items.length ? (
              <ul className="rounded-2xl border border-line bg-surface p-1.5">
                {latest.items.map((a) => (
                  <ArticleCard key={a.id} article={a} variant="compact" />
                ))}
              </ul>
            ) : (
              <EmptyState title="아직 수집된 기사가 없습니다" />
            )}
          </section>
        </div>

        {/* 우측 레일 */}
        <aside className="space-y-4" aria-label="보조 정보">
          <section className="rounded-2xl border border-line bg-surface p-3" aria-labelledby="rail-repos">
            <div className="mb-1 flex items-center justify-between px-3 pt-1">
              <h2 id="rail-repos" className="text-sm font-semibold">IssueHub 주목 저장소</h2>
              <Link href="/github?sort=growth" className="text-xs font-medium text-accent-fg hover:underline">더 보기</Link>
            </div>
            <p className="px-3 pb-1 text-[11px] text-muted">GitHub 공식 Trending 아님 · 관측 스냅샷 기준</p>
            <ul>
              {repos.items.map((r) => (
                <RepoCard key={r.id} repo={r} compact />
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="rail-topics">
            <h2 id="rail-topics" className="mb-3 text-sm font-semibold">자주 등장하는 토픽</h2>
            <ul className="flex flex-wrap gap-1.5">
              {topTopics.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/topics/${t.slug}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-elevated/50 px-2.5 text-[13px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg"
                  >
                    #{t.nameKo}
                    <span className="tabular text-xs text-muted">{formatCount(t.articleCount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-line bg-surface p-4" aria-labelledby="rail-sources">
            <h2 id="rail-sources" className="mb-3 text-sm font-semibold">최근 수집 출처</h2>
            <ul className="space-y-3">
              {sources.map((s) => (
                <li key={s.slug} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{s.name}</p>
                    <p className="flex items-center gap-1 text-xs text-muted">
                      <Clock className="size-3" aria-hidden />
                      {s.lastFetchedAt ? <LocalTime iso={s.lastFetchedAt} /> : "수집 기록 없음"}
                    </p>
                  </div>
                  <TierBadge tier={s.tier} />
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <p className="rounded-xl border border-line bg-surface/50 px-4 py-3 text-xs leading-relaxed text-muted">
        IssueHub는 각 출처의 제목·공개 메타데이터·발췌와 원문 링크만 제공합니다. 출처 유형(공식/커뮤니티/개인)은 신뢰도 점수가 아니며, 내용의 사실 여부는 반드시 원문에서 확인하세요.{" "}
        <Link href="/about" className="text-accent-fg hover:underline">데이터 출처와 정책</Link>
      </p>
    </div>
  );
}
