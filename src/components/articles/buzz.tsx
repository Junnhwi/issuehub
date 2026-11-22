import { Flame, MessageSquare, Triangle, TrendingUp } from "lucide-react";
import type { Article } from "@/types";
import { BUZZ_EXPLAIN, BUZZ_RULES, buzzLevel } from "@/lib/buzz";
import { cn, formatCount } from "@/lib/utils";

/** 화제도 칩(큰 화제/화제). 기준을 넘지 않거나 반응 수치가 없는 글은 아무것도 그리지 않는다 */
export function BuzzBadge({ article: a }: { article: Article }) {
  const level = buzzLevel(a.popularity, a.commentsCount);
  if (!level) return null;
  const hot = level === "hot";
  const Icon = hot ? Flame : TrendingUp;
  return (
    <span
      title={BUZZ_EXPLAIN}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold",
        // 빨강은 하락·경고로 읽히므로 화제도에는 쓰지 않는다
        hot ? "hot-chip" : "bg-accent-soft text-accent-fg",
      )}
    >
      <Icon className="relative size-3.5" aria-hidden />
      <span className="relative">{BUZZ_RULES[level].label}</span>
    </span>
  );
}

/** 반응 수치: ▲ 점수 · 댓글 수. 출처가 제공한 값만, 없으면 표시하지 않는다 */
export function Engagement({ article: a, className }: { article: Article; className?: string }) {
  if (a.popularity === null && a.commentsCount === null) return null;
  return (
    <span className={cn("inline-flex items-center gap-3 font-mono text-[13px] font-medium text-fg-2 tabular", className)} title={BUZZ_EXPLAIN}>
      {a.popularity !== null && (
        <span className="inline-flex items-center gap-1" aria-label={`점수 ${a.popularity}점`}>
          <Triangle className="size-3 fill-current text-accent-fg" aria-hidden />
          {formatCount(a.popularity)}
          <span className="font-sans text-[12px] font-normal text-muted">점</span>
        </span>
      )}
      {a.commentsCount !== null && (
        <span className="inline-flex items-center gap-1" aria-label={`댓글 ${a.commentsCount}개`}>
          <MessageSquare className="size-3.5 text-muted" aria-hidden />
          {formatCount(a.commentsCount)}
          <span className="font-sans text-[12px] font-normal text-muted">댓글</span>
        </span>
      )}
    </span>
  );
}
