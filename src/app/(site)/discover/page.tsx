import { SearchX } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { getData } from "@/lib/data";
import { articleListSchema, parseLenient, toParamObject } from "@/lib/validation/params";
import { ArticleList, ArticleRow } from "@/components/articles/article-row";
import { QueryFilters, type FilterField } from "@/components/articles/query-filters";
import { TopicFilter } from "@/components/articles/topic-filter";
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
  const [page, sources, topics] = await Promise.all([data.listArticles(params), data.listSources(), data.listTopics()]);

  const fields: FilterField[] = [
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
        { value: "popular", label: "점수순" },
        { value: "discussed", label: "댓글순" },
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
        description="개발 소식을 토픽·출처·기간별로 찾아보세요. 필터는 주소에 저장되어 그대로 공유할 수 있습니다."
      />

      <div className="mb-6 space-y-4 border-b border-line pb-5">
        <TopicFilter basePath="/discover" params={raw} topics={topics} active={params.topic} countKey="articleCount" />
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
        {params.sort === "popular" && " · Hacker News 점수 순 · 점수가 없는 출처(공식 블로그 등)는 뒤에 표시됩니다"}
        {params.sort === "discussed" && " · Hacker News 댓글 수 순 · 댓글 수가 없는 출처는 뒤에 표시됩니다"}
      </p>

      {page.items.length ? (
        <ArticleList>
          {page.items.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </ArticleList>
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
