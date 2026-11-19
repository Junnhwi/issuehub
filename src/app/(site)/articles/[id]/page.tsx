import { ArrowLeft, ExternalLink, MessagesSquare, Quote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getData } from "@/lib/data";
import { uuidSchema } from "@/lib/validation/params";
import { hostOf } from "@/lib/utils";
import { articleBookmark } from "@/components/articles/article-card";
import { ArticleList, ArticleRow } from "@/components/articles/article-row";
import { DemoBadge, SummaryStatusBadge, TierBadge, TopicTag } from "@/components/articles/badges";
import { BookmarkButton } from "@/components/articles/bookmark-button";
import { CopyLinkButton } from "@/components/articles/copy-link-button";
import { SummaryPanel } from "@/components/articles/summary-panel";
import { buttonClass } from "@/components/ui/button";
import { LocalTime } from "@/components/ui/local-time";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  if (!uuidSchema.safeParse(id).success) return null;
  return getData().getArticle(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await load((await params).id);
  return { title: res ? (res.article.titleKo ?? res.article.title) : "이슈를 찾을 수 없음" };
}

export default async function ArticlePage({ params }: Props) {
  const res = await load((await params).id);
  if (!res) notFound();
  const { article: a, related } = res;

  return (
    <div className="mx-auto max-w-[780px]">
      <Link href="/discover" className="mb-6 inline-flex h-9 items-center gap-1.5 rounded-lg text-sm font-medium text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        이슈 탐색으로
      </Link>

      <article>
        <header>
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {a.topics.map((t) => (
              <TopicTag key={t} slug={t} size="md" />
            ))}
          </div>
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {a.source.kind === "demo" && <DemoBadge />}
            <TierBadge tier={a.source.tier} />
            <SummaryStatusBadge status={a.summaryStatus} sourceKind={a.source.kind} />
          </div>
          <h1 className="text-[26px] font-bold leading-[1.3] tracking-tight md:text-[32px]">{a.titleKo ?? a.title}</h1>
          {a.titleKo && a.titleKo !== a.title && (
            <p className="mt-2 text-[15px] text-muted" lang="en">
              원제: {a.title}
            </p>
          )}

          <dl className="mt-5 grid gap-x-6 gap-y-2 rounded-xl border border-line bg-surface/60 p-4 text-[13px] sm:grid-cols-3">
            <div>
              <dt className="text-muted">원출처</dt>
              <dd className="mt-0.5 font-medium">
                {a.source.homepageUrl ? (
                  <a href={a.source.homepageUrl} target="_blank" rel="noopener noreferrer" className="hover:text-accent-fg hover:underline">
                    {a.source.name}
                  </a>
                ) : (
                  a.source.name
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted">원문 게시</dt>
              <dd className="mt-0.5 font-medium">{a.publishedAt ? <LocalTime iso={a.publishedAt} mode="absolute" /> : "정보 없음"}</dd>
            </div>
            <div>
              <dt className="text-muted">IssueHub 수집</dt>
              <dd className="mt-0.5 font-medium">
                <LocalTime iso={a.fetchedAt} mode="absolute" />
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            <a href={a.originalUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md")}>
              원문 보기 <span className="font-normal opacity-80">· {hostOf(a.originalUrl)}</span>
              <ExternalLink className="size-4" aria-hidden />
            </a>
            {a.discussionUrl && (
              <a href={a.discussionUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
                <MessagesSquare className="size-4" aria-hidden />
                HN 토론 보기
              </a>
            )}
            <CopyLinkButton url={a.originalUrl} />
            <BookmarkButton item={articleBookmark(a)} withLabel />
          </div>
        </header>

        <div className="mt-8 space-y-6">
          <SummaryPanel article={a} />

          {a.excerpt && (
            <section className="rounded-2xl border border-line p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted">
                <Quote className="size-4" aria-hidden />
                {a.excerptKo ? "발췌 번역 · AI가 원문 발췌를 한국어로 옮겼습니다" : "원문 발췌 · 공개 메타데이터"}
              </h2>
              <p className="text-[15.5px] leading-[1.8] text-fg-2" lang={a.excerptKo ? "ko" : undefined}>
                {a.excerptKo ?? a.excerpt}
              </p>
              {a.excerptKo && (
                <details className="group mt-3 border-t border-line pt-3">
                  <summary className="cursor-pointer list-none text-[13px] font-medium text-muted hover:text-fg">
                    <span className="group-open:hidden">원문 보기</span>
                    <span className="hidden group-open:inline">원문 접기</span>
                  </summary>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted" lang="en">
                    {a.excerpt}
                  </p>
                </details>
              )}
            </section>
          )}
        </div>
      </article>

      {related.length > 0 && (
        <section className="mt-12" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-3 text-[15px] font-semibold">
            관련 이슈
          </h2>
          <ArticleList>
            {related.map((r) => (
              <ArticleRow key={r.id} article={r} dense />
            ))}
          </ArticleList>
        </section>
      )}
    </div>
  );
}
