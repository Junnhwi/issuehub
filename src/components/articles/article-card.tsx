import { ArrowUpRight, MessageSquareText } from "lucide-react";
import Link from "next/link";
import type { Article } from "@/types";
import { cn, formatCount, hostOf } from "@/lib/utils";
import { LocalTime } from "@/components/ui/local-time";
import { BookmarkButton } from "./bookmark-button";
import { DemoBadge, SummaryStatusBadge, TierBadge, TopicTag } from "./badges";

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

/** 카드 본문 미리보기: 요약 완료면 요약, 아니면 원문 발췌(레이블로 구분) */
function Preview({ a, lines }: { a: Article; lines: string }) {
  const text = a.summaryStatus === "completed" && a.summaryKo ? a.summaryKo : a.excerpt;
  if (!text) return null;
  return (
    <p className={cn("text-sm leading-relaxed text-fg-2", lines)}>
      {a.summaryStatus !== "completed" && <span className="mr-1.5 text-xs font-medium text-muted">원문 발췌</span>}
      {text}
    </p>
  );
}

function Meta({ a }: { a: Article }) {
  const time = a.publishedAt ?? a.fetchedAt;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
      <span className="truncate font-medium text-fg-2">{a.source.name}</span>
      <span aria-hidden>·</span>
      <span>
        {a.publishedAt ? "게시 " : "수집 "}
        <LocalTime iso={time} />
      </span>
      {a.popularity !== null && (
        <>
          <span aria-hidden>·</span>
          <span className="tabular inline-flex items-center gap-1" title="출처에서 제공한 인기 지표(예: Hacker News points)">
            <MessageSquareText className="size-3.5" aria-hidden />
            {formatCount(a.popularity)} pts
          </span>
        </>
      )}
    </div>
  );
}

export function ArticleCard({ article: a, variant = "row" }: { article: Article; variant?: "row" | "featured" | "compact" }) {
  const title = a.titleKo ?? a.title;
  const href = `/articles/${a.id}`;

  if (variant === "compact") {
    return (
      <li className="group relative flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-hover">
        <div className="min-w-0 flex-1">
          <Link href={href} className="line-clamp-2 text-[15px] font-medium leading-snug text-fg after:absolute after:inset-0 after:rounded-xl">
            {title}
          </Link>
          <div className="mt-1.5">
            <Meta a={a} />
          </div>
        </div>
        <SummaryStatusBadge status={a.summaryStatus} sourceKind={a.source.kind} />
      </li>
    );
  }

  const featured = variant === "featured";
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-2xl border border-line bg-surface transition-colors hover:border-line-strong focus-within:border-line-strong",
        featured ? "p-5 md:p-6" : "p-4 md:p-5",
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {a.source.kind === "demo" && <DemoBadge />}
        <TierBadge tier={a.source.tier} />
        <SummaryStatusBadge status={a.summaryStatus} sourceKind={a.source.kind} />
      </div>
      <h3 className={cn("font-semibold text-fg", featured ? "line-clamp-3 text-xl md:text-[22px]" : "line-clamp-2 text-[17px] leading-snug")}>
        <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl">
          {title}
        </Link>
      </h3>
      {a.titleKo && <p className="mt-1 line-clamp-1 text-[13px] text-muted">원제: {a.title}</p>}
      <div className={cn("mt-3", featured && "flex-1")}>
        <Preview a={a} lines={featured ? "line-clamp-4" : "line-clamp-2"} />
        {featured && a.summaryStatus === "completed" && a.keyPoints.length > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line pt-4">
            {a.keyPoints.slice(0, 3).map((p) => (
              <li key={p} className="flex gap-2.5 text-sm leading-relaxed text-fg-2">
                <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                {p}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <Meta a={a} />
          {a.topics.length > 0 && (
            <div className="-ml-1.5 flex flex-wrap">
              {a.topics.map((t) => (
                <TopicTag key={t} slug={t} />
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={a.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 grid size-9 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-line-strong hover:text-fg"
            aria-label={`원문 열기: ${hostOf(a.originalUrl)} (새 창)`}
            title={`원문 열기 · ${hostOf(a.originalUrl)}`}
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
          <BookmarkButton item={articleBookmark(a)} />
        </div>
      </div>
    </article>
  );
}
