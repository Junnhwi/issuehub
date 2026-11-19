import { Sparkles } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/types";
import { formatCount } from "@/lib/utils";
import { LocalTime } from "@/components/ui/local-time";
import { BookmarkButton } from "./bookmark-button";
import { TopicTag } from "./badges";
import { SourceLinks, TierLabel } from "./article-row";

export function articleBookmark(a: Article) {
  return {
    type: "article" as const,
    id: a.id,
    title: a.titleKo ?? a.title,
    url: a.originalUrl,
    href: `/articles/${a.id}`,
    subtitle: a.source.name,
    tags: a.topics,
  };
}

/** 대시보드의 대표 이슈 하나. 위계를 표현해야 하는 곳이라 이것만 카드로 띄운다. */
export function ArticleCard({ article: a }: { article: Article; variant?: "featured" }) {
  const done = a.summaryStatus === "completed" && !!a.summaryKo;
  const demo = a.source.kind === "demo";
  const time = a.publishedAt ?? a.fetchedAt;

  return (
    <article className="group relative flex flex-col rounded-2xl border border-line bg-surface p-5 transition-colors hover:border-line-strong focus-within:border-line-strong md:p-6">
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {a.topics.map((t) => (
            <TopicTag key={t} slug={t} size="md" />
          ))}
        </div>
        <span className="shrink-0 pt-1 text-[13px] text-muted">
          <LocalTime iso={time} />
        </span>
      </div>

      <h3 className="line-clamp-3 text-[22px] font-bold leading-[1.35] tracking-tight md:text-[24px]">
        <Link href={`/articles/${a.id}`} className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:underline">
          {a.titleKo ?? a.title}
        </Link>
      </h3>
      {a.titleKo && (
        <p className="mt-1.5 line-clamp-1 text-[13px] text-muted" lang="en">
          {a.title}
        </p>
      )}

      <div className="mt-4">
        {done ? (
          <>
            <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent-fg">
              <Sparkles className="size-3.5" aria-hidden />
              {demo ? "예시 요약 · AI 생성 아님" : "AI 한국어 요약"}
            </p>
            <p className="line-clamp-4 text-[15.5px] leading-[1.75] text-fg-2">{a.summaryKo}</p>
            {a.keyPoints.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-line pt-4">
                {a.keyPoints.slice(0, 3).map((p) => (
                  <li key={p} className="flex gap-2.5 text-[14.5px] leading-relaxed text-fg-2">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          a.excerpt && (
            <>
              <p className="mb-1.5 text-[12px] font-medium text-muted">{a.excerptKo ? "발췌 번역 · AI" : "원문 발췌 · 한국어 처리 대기"}</p>
              <p className={a.excerptKo ? "line-clamp-5 text-[15px] leading-[1.75] text-fg-2" : "line-clamp-5 text-[14.5px] leading-relaxed text-muted"} lang={a.excerptKo ? "ko" : undefined}>
                {a.excerptKo ?? a.excerpt}
              </p>
            </>
          )
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-4">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
          <span className="font-medium text-fg-2">{a.source.name}</span>
          <TierLabel tier={a.source.tier} />
          {a.popularity !== null && <span className="tabular font-mono text-[12px]">{formatCount(a.popularity)} pts</span>}
          {demo && <span className="font-medium text-warning">데모</span>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <SourceLinks article={a} />
          <BookmarkButton item={articleBookmark(a)} ghost />
        </div>
      </div>
    </article>
  );
}
