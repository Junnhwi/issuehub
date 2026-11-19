import { SearchX } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { TOPICS } from "@/config/topics";
import { getData } from "@/lib/data";
import { articleListSchema, parseLenient, toParamObject } from "@/lib/validation/params";
import { ArticleCard } from "@/components/articles/article-card";
import { QueryFilters, type FilterField } from "@/components/articles/query-filters";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";

export const metadata: Metadata = { title: "이슈 탐색" };

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function DiscoverPage({ searchParams }: { searchParams: SP }) {
  const raw = toParamObject(await searchParams);
  const params = parseLenient(articleListSchema, raw);
  const data = getData();
  const [page, sources] = await Promise.all([data.listArticles(params), data.listSources()]);

  const fields: FilterField[] = [
    { name: "topic", label: "토픽", type: "select", defaultValue: "", options: [{ value: "", label: "전체" }, ...TOPICS.map((t) => ({ value: t.slug, label: t.nameKo }))] },
    {
      name: "source",
      label: "출처",
      type: "select",
      defaultValue: "",
      options: [{ value: "", label: "전체" }, ...sources.filter((s) => s.kind !== "github").map((s) => ({ value: s.slug, label: s.name }))],
    },
    {
      name: "tier",
      label: "출처 유형",
      type: "select",
      defaultValue: "",
      options: [
        { value: "", label: "전체" },
        { value: "official", label: "공식" },
        { value: "community", label: "커뮤니티" },
        { value: "independent", label: "개인·독립" },
      ],
    },
    {
      name: "period",
      label: "기간",
      type: "segment",
      defaultValue: "all",
      options: [
        { value: "24h", label: "24시간" },
        { value: "7d", label: "7일" },
        { value: "30d", label: "30일" },
        { value: "all", label: "전체" },
      ],
    },
    {
      name: "sort",
      label: "정렬",
      type: "segment",
      defaultValue: "latest",
      options: [
        { value: "latest", label: "최신순" },
        { value: "relevant", label: "연관도순" },
        { value: "popular", label: "인기순" },
      ],
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            <span>Discover</span>
            {page.asOf && (
              <>
                <span aria-hidden>·</span>
                <span>
                  최종 업데이트 <LocalTime iso={page.asOf} />
                </span>
              </>
            )}
          </>
        }
        title="이슈 탐색"
        description="키워드, 토픽, 출처, 기간으로 개발 소식을 찾아보세요. 필터 상태는 주소에 저장되어 공유하거나 뒤로 가기로 돌아올 수 있습니다."
      />

      <div className="sticky top-[120px] z-20 -mx-4 mb-5 border-b border-line bg-bg/90 px-4 py-3 backdrop-blur-md md:top-16 md:-mx-6 md:px-6 xl:-mx-8 xl:px-8">
        <QueryFilters fields={fields} searchPlaceholder="제목·요약에서 검색" />
      </div>

      <p className="mb-3 text-[13px] text-muted" aria-live="polite">
        {params.q && (
          <>
            <strong className="font-semibold text-fg">“{params.q}”</strong> 검색 결과{" "}
          </>
        )}
        <span className="tabular">{page.total?.toLocaleString("ko-KR") ?? page.items.length}건</span>
        {params.sort === "relevant" && " · 연관도는 등록된 토픽 키워드 일치 수입니다"}
        {params.sort === "popular" && " · 인기 지표가 없는 출처는 뒤에 표시됩니다"}
      </p>

      {page.items.length ? (
        <div className="grid gap-3">
          {page.items.map((a) => (
            <ArticleCard key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={SearchX}
          title="조건에 맞는 이슈가 없습니다"
          description="검색어를 줄이거나 기간을 넓혀 보세요."
          action={
            <Link href="/discover" className={buttonClass("secondary", "sm")}>
              필터 초기화
            </Link>
          }
        />
      )}

      <Pagination basePath="/discover" params={raw} cursor={params.cursor} nextCursor={page.nextCursor} limit={params.limit} total={page.total} shown={page.items.length} />
    </div>
  );
}
