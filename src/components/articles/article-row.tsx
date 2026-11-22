import { ArrowUpRight, MessagesSquare, PenLine, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import type { Article, SourceTier } from "@/types";
import { cn, hostOf } from "@/lib/utils";
import { ARTICLE_KIND_LABEL, articleKind } from "@/lib/article-kind";
import { LocalTime } from "@/components/ui/local-time";
import { articleBookmark } from "./article-card";
import { BookmarkButton } from "./bookmark-button";
import { TopicTag } from "./badges";
import { BuzzBadge, Engagement } from "./buzz";

const TIER = {
  official: { label: "공식", icon: ShieldCheck, cls: "text-success" },
  community: { label: "커뮤니티", icon: Users, cls: "text-muted" },
  independent: { label: "개인", icon: PenLine, cls: "text-muted" },
} as const;

/** 출처 유형: 상자 없는 인라인 레이블(아이콘 + 글자, 색에만 의존하지 않음) */
export function TierLabel({ tier }: { tier: SourceTier }) {
  const t = TIER[tier];
  return (
    <span className={cn("inline-flex items-center gap-1", t.cls)} title="출처 유형(신뢰도 점수가 아닙니다)">
      <t.icon className="size-3.5" aria-hidden />
      {t.label}
    </span>
  );
}

const linkBtn =
  "relative z-10 inline-flex h-11 min-w-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-fg-2 transition-[border-color,color,transform] hover:border-line-strong hover:text-fg active:scale-[0.97] md:h-9 md:px-3";

/** 원문 사이트와 커뮤니티 토론으로 가는 외부 링크(새 창) */
export function SourceLinks({ article: a, compact = false }: { article: Article; compact?: boolean }) {
  const host = hostOf(a.originalUrl);
  return (
    <>
      <a href={a.originalUrl} target="_blank" rel="noopener noreferrer" className={linkBtn} aria-label={`원문 열기: ${host} (새 창)`}>
        <span className="text-fg">원문</span>
        {!compact && <span className="max-w-[18ch] truncate font-normal text-muted">{host}</span>}
        <ArrowUpRight className="size-3.5 shrink-0" aria-hidden />
      </a>
      {a.discussionUrl && (
        <a href={a.discussionUrl} target="_blank" rel="noopener noreferrer" className={linkBtn} aria-label="Hacker News 토론 열기 (새 창)">
          <MessagesSquare className="size-3.5 shrink-0" aria-hidden />
          {compact ? "토론" : "HN 토론"}
        </a>
      )}
    </>
  );
}

/**
 * 발행처 표시. HN 글은 HN이 발견·토론 출처일 뿐이므로 원문 도메인을 발행처로 보여 준다.
 * 출처 유형·화제도는 신뢰도나 사실 여부를 뜻하지 않는다.
 */
export function Publisher({ article: a }: { article: Article }) {
  const host = hostOf(a.originalUrl);
  if (a.source.kind === "hackernews" && host !== "news.ycombinator.com") {
    return (
      <>
        <span className="font-medium text-fg-2">{host}</span>
        <span title="Hacker News에서 발견한 글입니다. 발행처는 원문 도메인이며, HN 점수·댓글은 관심도일 뿐 사실 여부와 관계없습니다.">HN에서 발견</span>
      </>
    );
  }
  return (
    <>
      <span className="font-medium text-fg-2">{a.source.name}</span>
      <TierLabel tier={a.source.tier} />
    </>
  );
}

/** 기사 성격(제목 기준 자동 분류). 기본값인 뉴스·의견은 표시하지 않는다 */
export function KindLabel({ article: a }: { article: Article }) {
  const kind = articleKind(a.title, a.originalUrl);
  if (kind === "news") return null;
  return (
    <span className="text-fg-2" title="제목·주소 기준 자동 분류입니다(내용 검증 아님)">
      {ARTICLE_KIND_LABEL[kind]}
    </span>
  );
}

/**
 * 이슈 한 줄. 토픽 → 제목 → 요약 → 출처·링크 순서로 읽힌다.
 * 요약이 완료된 글은 AI 요약을, 아니면 발췌(한국어 번역이 있으면 번역)를 보조로 보여 준다.
 */
export function ArticleRow({ article: a, dense = false, related = [] }: { article: Article; dense?: boolean; related?: Article[] }) {
  const done = a.summaryStatus === "completed" && !!a.summaryKo;
  const preview = done ? a.summaryKo : (a.excerptKo ?? a.excerpt);
  const korean = done || !!a.excerptKo;
  const time = a.publishedAt ?? a.fetchedAt;
  const demo = a.source.kind === "demo";
  const topics = dense ? a.topics.slice(0, 1) : a.topics;

  return (
    <li className="group relative transition-colors hover:bg-hover/40 focus-within:bg-hover/40">
      <div className={dense ? "px-4 py-4" : "px-4 py-5 md:px-6"}>
        <div className="mb-2.5 flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap gap-1.5">
            <BuzzBadge article={a} />
            {topics.map((t) => (
              <TopicTag key={t} slug={t} />
            ))}
            {done && (
              <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent-soft px-2.5 text-[12px] font-semibold text-accent-fg">
                <Sparkles className="size-3.5" aria-hidden />
                {demo ? "예시 요약" : "AI 요약"}
              </span>
            )}
          </div>
          <span className="shrink-0 pt-0.5 text-[13px] text-muted">
            <LocalTime iso={time} />
          </span>
        </div>

        <h3 className={cn("font-semibold leading-[1.4] tracking-[-0.01em] text-fg", dense ? "line-clamp-2 text-[15.5px]" : "line-clamp-2 text-[17px] md:text-[18px]")}>
          <Link href={`/articles/${a.id}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {a.titleKo ?? a.title}
          </Link>
        </h3>
        {a.titleKo && a.titleKo !== a.title && !dense && (
          <p className="mt-1 line-clamp-1 text-[13px] text-muted" lang="en">
            {a.title}
          </p>
        )}

        {preview && !dense && (
          <p className={cn("mt-2.5 line-clamp-2 max-w-[75ch] leading-relaxed", korean ? "text-[15px] text-fg-2" : "text-[14px] text-muted")} lang={korean ? "ko" : undefined}>
            {!done && <span className="mr-1.5 text-[12px] font-medium text-muted/80">{a.excerptKo ? "발췌 번역" : "원문 발췌"}</span>}
            {preview}
          </p>
        )}

        <div className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-2", dense ? "mt-2.5" : "mt-4")}>
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
            <Engagement article={a} />
            <Publisher article={a} />
            <KindLabel article={a} />
            {demo && <span className="font-medium text-warning">데모</span>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <SourceLinks article={a} compact={dense} />
            <BookmarkButton item={articleBookmark(a)} ghost />
          </div>
        </div>
        {related.length > 0 && (
          <p className="relative z-10 mt-2.5 flex flex-wrap gap-x-2 gap-y-1 text-[13px] text-muted">
            <span>같은 소식 다른 출처 {related.length}</span>
            {related.map((r) => (
              <Link key={r.id} href={`/articles/${r.id}`} className="font-medium text-fg-2 underline-offset-2 hover:text-fg hover:underline" title={r.titleKo ?? r.title}>
                {hostOf(r.originalUrl)}
              </Link>
            ))}
          </p>
        )}
      </div>
    </li>
  );
}

/** 구분선으로 나뉜 리스트 컨테이너 */
export function ArticleList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("stagger divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface", className)}>{children}</ul>;
}
