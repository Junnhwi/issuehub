import { ArrowUpRight, CalendarDays, Gamepad2, LineChart, ThumbsUp, Users } from "lucide-react";
import Link from "next/link";
import type { Game } from "@/types";
import { reviewTone } from "@/lib/games";
import { cn } from "@/lib/utils";

const TONE = {
  positive: "bg-success-soft text-success",
  mixed: "bg-warning-soft text-warning",
  negative: "bg-danger-soft text-danger",
} as const;

/** Steam 사용자 평가: Steam 표기 그대로 + 긍정 비율 + 평가 수 */
export function ReviewBadge({ game: g }: { game: Game }) {
  if (!g.review) return <span className="text-[13px] text-muted">{g.comingSoon ? "출시 전" : "평가 없음"}</span>;
  const tone = reviewTone(g.review.percent, g.review.count);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]" title="Steam 사용자 평가(Steam이 공개한 값)">
      <span className={cn("inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[12px] font-semibold", tone ? TONE[tone] : "bg-elevated text-fg-2")}>
        <ThumbsUp className="size-3.5" aria-hidden />
        {g.review.label}
      </span>
      <span className="tabular font-mono font-medium text-fg-2">{g.review.percent}%</span>
      <span className="tabular text-muted">{g.review.count.toLocaleString("ko-KR")}개 평가</span>
    </span>
  );
}

export function GameRow({ game: g, rank }: { game: Game; rank?: number }) {
  const desc = g.descriptionKo ?? g.description;
  return (
    <li className="group relative grid gap-4 px-4 py-5 transition-colors hover:bg-hover/40 focus-within:bg-hover/40 sm:grid-cols-[200px_minmax(0,1fr)] md:px-5">
      <div className="relative aspect-[460/215] overflow-hidden rounded-lg border border-line bg-elevated">
        {g.headerImage ? (
          // Steam CDN 이미지를 그대로 표시(최적화 서버를 거치지 않음)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.headerImage} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted">
            <Gamepad2 className="size-8" aria-hidden />
          </div>
        )}
        {rank !== undefined && (
          <span className="tabular absolute left-2 top-2 rounded-md bg-black/70 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-white">#{rank}</span>
        )}
      </div>

      <div className="min-w-0">
        <h3 className="text-[17px] font-semibold leading-snug tracking-[-0.01em]">
          <Link href={`/games/${g.appid}`} className="outline-none after:absolute after:inset-0 focus-visible:underline">
            {g.name}
          </Link>
        </h3>
        <GameTags tags={g.tags.slice(0, 4)} />
        {desc && (
          <p className={cn("mt-2 line-clamp-2 max-w-[75ch] leading-relaxed", g.descriptionKo ? "text-[14.5px] text-fg-2" : "text-[14px] text-muted")} lang={g.descriptionKo ? "ko" : undefined}>
            {!g.descriptionKo && <span className="mr-1.5 text-[12px] font-medium text-muted/80">원문</span>}
            {desc}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <ReviewBadge game={g} />
          {g.currentPlayers !== null && g.currentPlayers > 0 && (
            <span className="tabular inline-flex items-center gap-1 text-[13px] text-fg-2" title="수집 시점의 동시접속자 수(Steam 공개 값)">
              <Users className="size-3.5 text-muted" aria-hidden />
              현재 동시접속 <span className="font-mono font-medium">{g.currentPlayers.toLocaleString("ko-KR")}</span>명
            </span>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            {g.releaseLabel && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" aria-hidden />
                {g.releaseLabel}
              </span>
            )}
            {g.price && (
              <span className="tabular">
                {g.discountPct ? <span className="mr-1 font-semibold text-success">-{g.discountPct}%</span> : null}
                {g.price}
                {g.discountEndsAt && <span className="ml-1 text-muted">· {endDay(g.discountEndsAt)}까지</span>}
              </span>
            )}
            {g.developers[0] && <span className="truncate">{g.developers.join(", ")}</span>}
            {g.isDemo && <span className="font-medium text-warning">데모</span>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {!g.isFree && !g.comingSoon && (
              <span className="pointer-events-none hidden h-9 items-center gap-1.5 px-1 text-[13px] font-medium text-muted transition-colors group-hover:text-fg sm:inline-flex" aria-hidden>
                <LineChart className="size-3.5" />
                가격 추이
              </span>
            )}
            <a
              href={g.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 inline-flex h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-[13px] font-medium text-fg-2 transition-colors hover:border-line-strong hover:text-fg md:h-9"
              aria-label={`${g.name} Steam 상점 열기 (새 창)`}
            >
              {g.isDemo ? "예시 링크" : "Steam 상점"}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </li>
  );
}

const endDay = (iso: string) => new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }).format(Date.parse(iso));

export function GameTags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1" aria-label="태그">
      {tags.map((t) => (
        <li key={t} className="rounded-md bg-elevated px-1.5 py-0.5 text-[12px] text-fg-2">
          {t}
        </li>
      ))}
    </ul>
  );
}

/** 대시보드 사이드용 한 줄: 이름 · 동시접속 · 긍정 비율 */
export function GameCompactRow({ game: g, rank }: { game: Game; rank: number }) {
  return (
    <li className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-hover">
      <span className="tabular w-5 shrink-0 font-mono text-xs text-muted">{rank}</span>
      <div className="min-w-0">
        <Link href={`/games/${g.appid}`} className="block truncate text-sm font-medium after:absolute after:inset-0 after:rounded-xl">
          {g.name}
        </Link>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-muted">
          {g.currentPlayers !== null && g.currentPlayers > 0 && (
            <span className="tabular inline-flex items-center gap-1">
              <Users className="size-3.5" aria-hidden />
              {g.currentPlayers.toLocaleString("ko-KR")}
            </span>
          )}
          {g.review && (
            <span className="tabular inline-flex items-center gap-1">
              <ThumbsUp className="size-3.5" aria-hidden />
              {g.review.percent}%
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
