import { ArrowRight, CheckCircle2, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { getData } from "@/lib/data";
import { formatCount, isOlderThan } from "@/lib/utils";
import { ArticleCard } from "@/components/articles/article-card";
import { ArticleList, ArticleRow, TierLabel } from "@/components/articles/article-row";
import { RepoCard } from "@/components/github/repo-card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { SectionTitle } from "@/components/ui/page-header";
import type { Stats } from "@/types";

export const dynamic = "force-dynamic";

/** 지표는 상자 없이 한 줄 띠로(스킬: 카드 남용 금지, 숫자는 고정폭) */
function Metric({ label, value, hint }: { label: string; value: number | null; hint: string }) {
  return (
    <div className="py-4 sm:px-6 sm:py-1 sm:first:pl-0">
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className="tabular mt-1.5 font-mono text-[30px] font-semibold leading-none tracking-tight text-fg">
        {value === null ? <span className="text-muted">—</span> : value.toLocaleString("ko-KR")}
      </dd>
      <dd className="mt-2 text-xs text-muted">{value === null ? "아직 집계되지 않았습니다" : hint}</dd>
    </div>
  );
}

function SyncStatus({ stats }: { stats: Stats }) {
  const last = stats.lastSuccessfulSyncAt;
  const stale = last ? isOlderThan(last, 13) : true;
  return (
    <p className="inline-flex items-center gap-2 text-[13px] text-fg-2">
      {last && !stale ? <CheckCircle2 className="size-4 text-success" aria-hidden /> : <TriangleAlert className="size-4 text-warning" aria-hidden />}
      {last ? (
        <span>
          마지막 성공 수집 <LocalTime iso={last} className="font-medium text-fg" />
          {stale && " · 지연됨"}
        </span>
      ) : (
        <span>아직 성공한 수집 기록이 없습니다</span>
      )}
      {stats.mode === "demo" && <span className="font-medium text-warning">데모</span>}
    </p>
  );
}

function RailSection({ id, title, action, note, children }: { id: string; title: string; action?: React.ReactNode; note?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <h2 id={id} className="text-sm font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {note && <p className="mb-2 text-[11px] text-muted">{note}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default async function DashboardPage() {
  const data = getData();
  const [stats, popular, latest, repos, topics, sources] = await Promise.all([
    data.getStats(),
    data.listArticles({ period: "7d", sort: "popular", limit: 4 }),
    data.listArticles({ period: "all", sort: "latest", limit: 10 }),
    data.listRepos({ sort: "growth", limit: 5 }),
    data.listTopics(),
    data.listSources(),
  ]);
  const [featured, ...others] = popular.items;
  const topTopics = [...topics].sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0));

  return (
    <div className="space-y-9 md:space-y-11">
      <section aria-labelledby="hero-title" className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-2 text-[13px] font-medium text-muted">Overview</p>
          <h1 id="hero-title" className="text-[26px] font-bold tracking-tight md:text-[30px]">
            기술의 흐름을 한눈에.
          </h1>
          <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-muted">
            개발 커뮤니티와 공식 출처의 새 소식, 눈에 띄는 GitHub 저장소를 출처와 함께 모았습니다. 한국어 요약은 원문 정보에 근거할 때만 붙입니다.
          </p>
        </div>
        <SyncStatus stats={stats} />
      </section>

      <dl aria-label="주요 지표" className="grid divide-y divide-line border-y border-line sm:grid-cols-[1.2fr_1fr_1fr] sm:divide-x sm:divide-y-0 sm:py-5">
        <Metric label="최근 24시간 수집 기사" value={stats.articlesLast24h} hint={stats.basis} />
        <Metric label="추적 중인 저장소" value={stats.reposTotal} hint="매일 Star 수를 기록합니다" />
        <Metric
          label="한국어 요약 완료"
          value={stats.summariesCompleted}
          hint={stats.mode === "demo" ? "데모 예시 요약 수 · AI 생성 아님" : "검증을 통과한 AI 요약"}
        />
      </dl>

      <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="top-title">
            <SectionTitle
              id="top-title"
              title="화제의 이슈"
              action={
                <Link href="/discover?period=7d&sort=popular" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-fg hover:underline">
                  최근 7일 · 점수순 <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              }
            />
            {featured ? (
              <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-start">
                <ArticleCard article={featured} variant="featured" />
                {others.length > 0 && (
                  <ArticleList>
                    {others.map((a) => (
                      <ArticleRow key={a.id} article={a} dense />
                    ))}
                  </ArticleList>
                )}
              </div>
            ) : (
              <EmptyState title="최근 7일간 수집된 이슈가 없습니다" description="수집기가 실행되면 이곳에 표시됩니다." />
            )}
          </section>

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
              <ArticleList>
                {latest.items.map((a) => (
                  <ArticleRow key={a.id} article={a} />
                ))}
              </ArticleList>
            ) : (
              <EmptyState title="아직 수집된 기사가 없습니다" />
            )}
          </section>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start" aria-label="보조 정보">
          <RailSection
            id="rail-repos"
            title="IssueHub 주목 저장소"
            note="GitHub 공식 Trending이 아닙니다 · 직접 기록한 스냅샷 기준"
            action={
              <Link href="/github?sort=growth" className="text-xs font-medium text-accent-fg hover:underline">
                더 보기
              </Link>
            }
          >
            <ul className="-mx-3">
              {repos.items.map((r) => (
                <RepoCard key={r.id} repo={r} compact />
              ))}
            </ul>
          </RailSection>

          <RailSection id="rail-topics" title="자주 등장하는 토픽">
            <ul className="space-y-0.5">
              {topTopics.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/topics/${t.slug}`}
                    className="-mx-2 flex h-9 items-center justify-between rounded-lg px-2 text-[14px] text-fg-2 transition-colors hover:bg-hover hover:text-fg"
                  >
                    <span className="flex items-center">
                      <span className="mr-2.5 size-2 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
                      {t.nameKo}
                    </span>
                    <span className="tabular font-mono text-xs text-muted">{formatCount(t.articleCount)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </RailSection>

          <RailSection id="rail-sources" title="최근 수집 출처">
            <ul className="space-y-3">
              {sources.map((s) => (
                <li key={s.slug} className="flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-fg-2">{s.name}</span>
                    <span className="text-xs text-muted">{s.lastFetchedAt ? <LocalTime iso={s.lastFetchedAt} /> : "수집 기록 없음"}</span>
                  </span>
                  <span className="shrink-0 text-xs">
                    <TierLabel tier={s.tier} />
                  </span>
                </li>
              ))}
            </ul>
          </RailSection>
        </aside>
      </div>

      <p className="border-t border-line pt-5 text-xs leading-relaxed text-muted">
        IssueHub는 각 출처의 제목·공개 메타데이터·발췌와 원문 링크만 제공합니다. 출처 유형(공식/커뮤니티/개인)은 신뢰도 점수가 아니며, 내용의 사실 여부는 원문에서 확인하세요.{" "}
        <Link href="/about" className="text-accent-fg hover:underline">
          데이터 출처와 정책
        </Link>
      </p>
    </div>
  );
}
