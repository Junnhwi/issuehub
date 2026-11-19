import { ArrowRight, Hash } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTopic, TOPICS } from "@/config/topics";
import { getData } from "@/lib/data";
import { articleListSchema, parseLenient, toParamObject } from "@/lib/validation/params";
import { cn } from "@/lib/utils";
import { ArticleCard } from "@/components/articles/article-card";
import { QueryFilters } from "@/components/articles/query-filters";
import { RepoCard } from "@/components/github/repo-card";
import { EmptyState } from "@/components/ui/empty-state";
import { SectionTitle } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export function generateStaticParams() {
  return TOPICS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const topic = getTopic((await params).slug);
  return { title: topic ? `#${topic.nameKo}` : "토픽을 찾을 수 없음" };
}

export default async function TopicPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const topic = getTopic(slug);
  if (!topic) notFound();

  const raw = toParamObject(await searchParams);
  const query = parseLenient(articleListSchema, { ...raw, topic: slug });
  const data = getData();
  const [articles, repos] = await Promise.all([data.listArticles({ ...query, limit: 12 }), data.listRepos({ topic: slug, sort: "stars", limit: 6 })]);

  return (
    <div>
      {/* 토픽 탭 */}
      <nav aria-label="토픽" className="-mx-4 mb-6 overflow-x-auto px-4 md:mx-0 md:px-0">
        <ul className="flex gap-1.5">
          {TOPICS.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/topics/${t.slug}`}
                aria-current={t.slug === slug ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors",
                  t.slug === slug ? "border-transparent bg-accent-soft text-accent-fg" : "border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg",
                )}
              >
                #{t.nameKo}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <header className="mb-8 rounded-2xl border border-line bg-surface p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-fg">
            <Hash className="size-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Topic</p>
            <h1 className="mt-1 text-2xl font-bold md:text-[28px]">{topic.nameKo}</h1>
            <p className="mt-1.5 text-[15px] text-muted">{topic.description}</p>
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="관련 키워드">
              {topic.keywords.map((k) => (
                <span key={k} className="rounded-md bg-elevated px-2 py-0.5 font-mono text-xs text-fg-2">
                  {k.trim()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-labelledby="topic-articles" className="min-w-0">
          <SectionTitle id="topic-articles" title="관련 이슈" />
          <div className="mb-4">
            <QueryFilters
              fields={[
                { name: "period", label: "기간", type: "segment", defaultValue: "all", options: [{ value: "7d", label: "7일" }, { value: "30d", label: "30일" }, { value: "all", label: "전체" }] },
                { name: "sort", label: "정렬", type: "segment", defaultValue: "latest", options: [{ value: "latest", label: "최신순" }, { value: "popular", label: "인기순" }] },
              ]}
            />
          </div>
          {articles.items.length ? (
            <div className="grid gap-3">
              {articles.items.map((a) => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          ) : (
            <EmptyState title="이 토픽의 이슈가 아직 없습니다" />
          )}
          <Pagination basePath={`/topics/${slug}`} params={raw} cursor={query.cursor} nextCursor={articles.nextCursor} limit={12} total={articles.total} shown={articles.items.length} />
        </section>

        <aside aria-labelledby="topic-repos">
          <SectionTitle
            id="topic-repos"
            title="관련 저장소"
            action={
              <Link href={`/github?topic=${slug}`} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent-fg hover:underline">
                더 보기 <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            }
          />
          {repos.items.length ? (
            <div className="grid gap-3">
              {repos.items.map((r) => (
                <RepoCard key={r.id} repo={r} />
              ))}
            </div>
          ) : (
            <EmptyState title="관련 저장소가 없습니다" />
          )}
        </aside>
      </div>
    </div>
  );
}
