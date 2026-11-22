import { ArrowLeft, ExternalLink, MessagesSquare, Quote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getData } from "@/lib/data";
import { uuidSchema } from "@/lib/validation/params";
import { toNotionMarkdown } from "@/lib/notion-markdown";
import { cn, hostOf } from "@/lib/utils";
import { ARTICLE_KIND_LABEL, articleKind } from "@/lib/article-kind";
import { articleBookmark } from "@/components/articles/article-card";
import { ArticleList, ArticleRow } from "@/components/articles/article-row";
import { DemoBadge, SummaryStatusBadge, TierBadge, TopicTag } from "@/components/articles/badges";
import { BookmarkButton } from "@/components/articles/bookmark-button";
import { BuzzBadge, Engagement } from "@/components/articles/buzz";
import { CopyLinkButton } from "@/components/articles/copy-link-button";
import { SummaryPanel } from "@/components/articles/summary-panel";
import { DeepReadPanel } from "@/components/articles/deep-read-panel";
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
  const { article: a, related, deepRead } = res;
  const image = deepRead?.status === "completed" ? deepRead.imageUrl : null;
  const hasReaction = a.popularity !== null || a.commentsCount !== null;
  const kind = articleKind(a.title, a.originalUrl);
  // HN은 발견·토론 출처이고 실제 발행처는 원문 도메인이다
  const viaHn = a.source.kind === "hackernews" && hostOf(a.originalUrl) !== "news.ycombinator.com";

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
            {!viaHn && <TierBadge tier={a.source.tier} />}
            {kind !== "news" && (
              <span className="inline-flex h-6 items-center rounded-full border border-line px-2.5 text-[12px] font-medium text-fg-2" title="제목·주소 기준 자동 분류입니다(내용 검증 아님)">
                {ARTICLE_KIND_LABEL[kind]}
              </span>
            )}
            <SummaryStatusBadge status={a.summaryStatus} sourceKind={a.source.kind} />
            <BuzzBadge article={a} />
          </div>
          <h1 className="text-[26px] font-bold leading-[1.3] tracking-tight md:text-[32px]">{a.titleKo ?? a.title}</h1>
          {a.titleKo && a.titleKo !== a.title && (
            <p className="mt-2 text-[15px] text-muted" lang="en">
              원제: {a.title}
            </p>
          )}

          <dl className={cn("mt-5 grid gap-x-6 gap-y-3 rounded-xl border border-line bg-surface/60 p-4 text-[13px] sm:grid-cols-3", hasReaction && "md:grid-cols-4")}>
            {hasReaction && (
              <div>
                <dt className="text-muted" title="관심도일 뿐 내용의 사실 여부와는 관계없습니다">HN 반응</dt>
                <dd className="mt-1">
                  <Engagement article={a} className="text-[15px]" />
                </dd>
              </div>
            )}
            <div>
              <dt className="text-muted">{viaHn ? "발행처" : "원출처"}</dt>
              <dd className="mt-0.5 font-medium">
                {viaHn ? (
                  <>
                    {hostOf(a.originalUrl)}
                    <span className="block text-xs font-normal text-muted">Hacker News에서 발견</span>
                  </>
                ) : a.source.homepageUrl ? (
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
            <CopyLinkButton text={toNotionMarkdown(a)} kind="note" />
            <CopyLinkButton text={a.originalUrl} />
            <BookmarkButton item={articleBookmark(a)} withLabel />
          </div>
        </header>

        {image && (
          // 원문이 공개한 대표 이미지(og:image)를 원문 서버에서 그대로 불러온다
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="page-in mt-6 aspect-[1200/630] w-full rounded-2xl border border-line bg-elevated object-cover" />
        )}

        <div className="mt-8 space-y-6">
          <SummaryPanel article={a} />
          <DeepReadPanel record={deepRead} fetchedAt={a.fetchedAt} />

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
