import { ArrowUpRight, GitFork, Star, TrendingUp, Hourglass } from "lucide-react";
import Link from "next/link";
import type { Repository } from "@/types";
import { formatCount, formatSigned } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LocalTime } from "@/components/ui/local-time";
import { BookmarkButton } from "@/components/articles/bookmark-button";
import { TopicTag } from "@/components/articles/badges";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "#3178c6", JavaScript: "#f1e05a", Python: "#3572A5", Go: "#00ADD8", Rust: "#dea584",
  "C++": "#f34b7d", C: "#555555", Java: "#b07219", Kotlin: "#A97BFF", Swift: "#F05138", Ruby: "#701516",
  "C#": "#178600", PHP: "#4F5D95", Shell: "#89e051", Zig: "#ec915c", Dart: "#00B4AB", Lua: "#000080",
};

export function repoBookmark(r: Repository) {
  return { type: "repo" as const, id: r.id, title: r.fullName, url: r.htmlUrl, href: null, subtitle: r.description, tags: r.topics };
}

export function LanguageDot({ language }: { language: string | null }) {
  if (!language) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-full ring-1 ring-black/10" style={{ background: LANG_COLORS[language] ?? "var(--muted)" }} aria-hidden />
      {language}
    </span>
  );
}

/** 스냅샷 2개 이상일 때만 증가량, 아니면 '집계 중' */
export function GrowthBadge({ repo }: { repo: Repository }) {
  if (!repo.growth) {
    return (
      <Badge title="서로 다른 날짜의 스타 스냅샷이 2개 이상 쌓이면 증가량을 표시합니다">
        <Hourglass className="size-3.5" aria-hidden />
        집계 중
      </Badge>
    );
  }
  const { delta, fromDate, toDate } = repo.growth;
  // 실제 관측 기간을 그대로 보여 준다(3일치 데이터를 7일 증가량이라 부르지 않음)
  const days = Math.max(1, Math.round((Date.parse(toDate) - Date.parse(fromDate)) / 86_400_000));
  return (
    <Badge tone={delta > 0 ? "success" : "neutral"} title={`${fromDate} → ${toDate} 관측 스냅샷 기준 (${days}일간)`}>
      <TrendingUp className="size-3.5" aria-hidden />
      <span className="tabular">{formatSigned(delta)}</span>
      <span className="font-normal opacity-80">{days}일</span>
    </Badge>
  );
}

/** GitHub 프로필 이미지(작게, 지연 로드). 데모 저장소는 실제 계정이 아니므로 그리지 않는다 */
export function OwnerAvatar({ repo: r, size }: { repo: Repository; size: number }) {
  if (r.isDemo) return <span className="shrink-0 rounded-md bg-elevated" style={{ width: size, height: size }} aria-hidden />;
  const owner = r.fullName.split("/")[0];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://github.com/${owner}.png?size=${size * 2}`} alt="" width={size} height={size} loading="lazy" decoding="async" referrerPolicy="no-referrer" className="shrink-0 rounded-md border border-line bg-elevated" />
  );
}

export function RepoCard({ repo: r, compact = false }: { repo: Repository; compact?: boolean }) {
  const [owner, name] = r.fullName.split("/");
  if (compact) {
    return (
      <li className="group relative rounded-xl px-3 py-2.5 transition-colors hover:bg-hover">
        <Link href={`/github/${r.id}`} className="flex min-w-0 items-center gap-2 text-sm font-medium after:absolute after:inset-0 after:rounded-xl">
          <OwnerAvatar repo={r} size={20} />
          <span className="truncate">
            <span className="text-muted">{owner}/</span>
            {name}
          </span>
        </Link>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted">
          <span className="tabular inline-flex items-center gap-1">
            <Star className="size-3.5" aria-hidden />
            {formatCount(r.starsTotal)}
          </span>
          {r.growth ? (
            <span className="tabular inline-flex items-center gap-1 text-success" title={`${r.growth.fromDate} → ${r.growth.toDate}`}>
              <TrendingUp className="size-3.5" aria-hidden />
              {formatSigned(r.growth.delta)}
            </span>
          ) : (
            <span>증가량 집계 중</span>
          )}
          <LanguageDot language={r.language} />
        </div>
      </li>
    );
  }

  return (
    <li className="group relative grid gap-x-8 gap-y-3 px-4 py-4 transition-colors hover:bg-hover/50 focus-within:bg-hover/50 sm:grid-cols-[minmax(0,1fr)_auto_auto] md:px-5">
      <div className="min-w-0">
        <h3 className="flex flex-wrap items-center gap-x-2 pr-20 text-[16px] font-semibold sm:pr-0">
          <OwnerAvatar repo={r} size={22} />
          <Link href={`/github/${r.id}`} className="break-all outline-none after:absolute after:inset-0 focus-visible:underline">
            <span className="font-normal text-muted">{owner}/</span>
            {name}
          </Link>
          {r.isDemo && <span className="text-xs font-medium text-warning">데모</span>}
        </h3>
        <p className="mt-1 line-clamp-2 max-w-[72ch] text-[14.5px] leading-relaxed text-fg-2">
          {r.summaryKo ?? r.description ?? <span className="text-muted">설명이 없습니다.</span>}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <LanguageDot language={r.language} />
          {r.pushedAt && (
            <span>
              push <LocalTime iso={r.pushedAt} />
            </span>
          )}
          {r.topics.length > 0 && (
            <span className="flex flex-wrap gap-1.5">
              {r.topics.map((t) => (
                <TopicTag key={t} slug={t} />
              ))}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 sm:flex-col sm:items-end sm:justify-center sm:gap-1.5">
        <span className="tabular inline-flex items-center gap-1.5 font-mono text-[15px] font-semibold text-fg" title="총 Stars">
          <Star className="size-4 text-muted" aria-hidden />
          {r.starsTotal.toLocaleString("ko-KR")}
        </span>
        <span className="tabular inline-flex items-center gap-1.5 font-mono text-[13px] text-muted" title="Forks">
          <GitFork className="size-3.5" aria-hidden />
          {r.forksTotal.toLocaleString("ko-KR")}
        </span>
        <GrowthBadge repo={r} />
      </div>

      <div className="absolute right-2 top-3 flex items-center sm:static sm:self-center">
        <a
          href={r.htmlUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`GitHub에서 ${r.fullName} 열기 (새 창)`}
          title="GitHub에서 보기"
          className="relative z-10 grid size-11 place-items-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-fg md:size-9"
        >
          <ArrowUpRight className="size-4" aria-hidden />
        </a>
        <BookmarkButton item={repoBookmark(r)} ghost />
      </div>
    </li>
  );
}

/** 저장소 리스트 컨테이너 */
export function RepoList({ children }: { children: React.ReactNode }) {
  return <ul className="stagger divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">{children}</ul>;
}
