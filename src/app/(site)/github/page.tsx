import { FolderSearch, Info } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TOPICS } from "@/config/topics";
import { getData } from "@/lib/data";
import { GROWTH_WINDOW_DAYS } from "@/lib/data/growth";
import { parseLenient, repoListSchema, toParamObject } from "@/lib/validation/params";
import { QueryFilters, type FilterField } from "@/components/articles/query-filters";
import { RepoCard } from "@/components/github/repo-card";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "GitHub 저장소" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function GithubPage({ searchParams }: { searchParams: SP }) {
  const raw = toParamObject(await searchParams);
  const params = parseLenient(repoListSchema, raw);
  const data = getData();
  const [page, languages] = await Promise.all([data.listRepos(params), data.listLanguages()]);

  const fields: FilterField[] = [
    { name: "language", label: "언어", type: "select", defaultValue: "", options: [{ value: "", label: "전체" }, ...languages.map((l) => ({ value: l, label: l }))] },
    { name: "topic", label: "토픽", type: "select", defaultValue: "", options: [{ value: "", label: "전체" }, ...TOPICS.map((t) => ({ value: t.slug, label: t.nameKo }))] },
    {
      name: "sort",
      label: "정렬",
      type: "segment",
      defaultValue: "stars",
      options: [
        { value: "stars", label: "총 Stars" },
        { value: "updated", label: "최근 push" },
        { value: "growth", label: "관측 증가량" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span>GitHub</span>
            {page.asOf && (
              <>
                <span aria-hidden>·</span>
                <span>
                  최종 수집 <LocalTime iso={page.asOf} />
                </span>
              </>
            )}
          </>
        }
        title="IssueHub 주목 저장소"
        description="GitHub Search API로 토픽별 활발한 저장소를 수집하고 매일 Star 수를 기록합니다. GitHub 공식 Trending 순위가 아닙니다."
      />

      <div className="mb-5 flex items-start gap-2 rounded-xl border border-line bg-surface/60 px-4 py-3 text-[13px] leading-relaxed text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden />
        <p>
          <strong className="font-semibold text-fg-2">관측 증가량</strong>은 IssueHub가 직접 기록한 스냅샷 중 최신 값과 그 이전 {GROWTH_WINDOW_DAYS}일 이내 가장 오래된 값의 차이입니다.
          서로 다른 날짜의 스냅샷이 2개 이상 없으면 <strong className="font-semibold text-fg-2">집계 중</strong>으로 표시하며, 0으로 간주하지 않습니다.
        </p>
      </div>

      <div className="sticky top-[120px] z-20 -mx-4 mb-5 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md md:top-16 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <QueryFilters fields={fields} searchPlaceholder="저장소 이름·설명 검색" />
      </div>

      <p className="tabular mb-3 text-[13px] text-muted">{page.total?.toLocaleString("ko-KR") ?? page.items.length}개 저장소</p>

      {page.items.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {page.items.map((r) => (
            <RepoCard key={r.id} repo={r} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderSearch}
          title="조건에 맞는 저장소가 없습니다"
          action={
            <Link href="/github" className={buttonClass("secondary", "sm")}>
              필터 초기화
            </Link>
          }
        />
      )}

      <Pagination basePath="/github" params={raw} cursor={params.cursor} nextCursor={page.nextCursor} limit={params.limit} total={page.total} shown={page.items.length} />
    </div>
  );
}
