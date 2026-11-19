import { ArrowUpRight, PenLine, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import type { Article, SourceTier } from "@/types";
import { cn, formatCount, hostOf } from "@/lib/utils";
import { LocalTime } from "@/components/ui/local-time";
import { articleBookmark } from "./article-card";
import { BookmarkButton } from "./bookmark-button";
import { TopicTag } from "./badges";

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

/**
 * 리스트 한 줄. 카드 대신 구분선으로 묶어 정보 밀도를 높인다.
 * 요약이 완료된 글만 'AI 요약' 표시와 요약을, 나머지는 '원문 발췌'를 보여 준다.
 */
export function ArticleRow({ article: a, dense = false }: { article: Article; dense?: boolean }) {
  const done = a.summaryStatus === "completed" && !!a.summaryKo;
  const preview = done ? a.summaryKo : a.excerpt;
  const time = a.publishedAt ?? a.fetchedAt;
  const demo = a.source.kind === "demo";

  return (
    <li className="group relative transition-colors hover:bg-hover/50 focus-within:bg-hover/50">
      <div className={cn("flex gap-4", dense ? "px-4 py-3.5" : "px-4 py-4 md:px-5 md:py-5")}>
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-muted">
            <span className="font-medium text-fg-2">{a.source.name}</span>
            <TierLabel tier={a.source.tier} />
            <span>
              <LocalTime iso={time} />
            </span>
            {a.popularity !== null && (
              <span className="tabular font-mono text-[12px]" title="출처 인기 지표(예: Hacker News points)">
                {formatCount(a.popularity)} pts
              </span>
            )}
            {demo && <span className="font-medium text-warning">데모</span>}
          </div>

          <h3 className={cn("font-semibold leading-snug text-fg", dense ? "line-clamp-2 text-[15px]" : "line-clamp-2 text-[16px] md:text-[17px]")}>
            <Link href={`/articles/${a.id}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
              {a.titleKo ?? a.title}
            </Link>
          </h3>
          {a.titleKo && !dense && (
            <p className="mt-0.5 line-clamp-1 text-[13px] text-muted" lang="en">
              {a.title}
            </p>
          )}

          {preview && !dense && (
            <p className="mt-2 line-clamp-2 max-w-[72ch] text-[14.5px] leading-relaxed text-fg-2">
              {done ? (
                <span className="mr-1.5 inline-flex items-center gap-1 align-[-2px] text-[12px] font-semibold text-accent-fg">
                  <Sparkles className="size-3.5" aria-hidden />
                  {demo ? "예시 요약" : "AI 요약"}
                </span>
              ) : (
                <span className="mr-1.5 text-[12px] font-medium text-muted">원문 발췌</span>
              )}
              {preview}
            </p>
          )}

          {a.topics.length > 0 && !dense && (
            <div className="-ml-1.5 mt-2 flex flex-wrap">
              {a.topics.map((t) => (
                <TopicTag key={t} slug={t} />
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-start gap-1.5 opacity-100 transition-opacity md:opacity-60 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <a
            href={a.originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative z-10 grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-elevated hover:text-fg active:scale-[0.96]"
            aria-label={`원문 열기: ${hostOf(a.originalUrl)} (새 창)`}
            title={`원문 열기 · ${hostOf(a.originalUrl)}`}
          >
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
          <BookmarkButton item={articleBookmark(a)} ghost />
        </div>
      </div>
    </li>
  );
}

/** 구분선으로 나뉜 리스트 컨테이너 */
export function ArticleList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface", className)}>{children}</ul>;
}
