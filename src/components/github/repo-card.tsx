import { ArrowUpRight, GitFork, Star, TrendingUp, Hourglass } from "lucide-react";
import type { Repository } from "@/types";
import { formatCount, formatSigned } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { LocalTime } from "@/components/ui/local-time";
import { BookmarkButton } from "@/components/articles/bookmark-button";
import { DemoBadge, TopicTag } from "@/components/articles/badges";

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
  return (
    <Badge tone={delta > 0 ? "success" : "neutral"} title={`${fromDate} → ${toDate} 관측 스냅샷 기준`}>
      <TrendingUp className="size-3.5" aria-hidden />
      <span className="tabular">{formatSigned(delta)}</span>
      <span className="font-normal opacity-80">관측</span>
    </Badge>
  );
}

export function RepoCard({ repo: r, compact = false }: { repo: Repository; compact?: boolean }) {
  const [owner, name] = r.fullName.split("/");
  if (compact) {
    return (
      <li className="group relative rounded-xl px-3 py-2.5 transition-colors hover:bg-hover">
        <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium after:absolute after:inset-0 after:rounded-xl">
          <span className="text-muted">{owner}/</span>
          {name}
        </a>
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
    <article className="group relative flex h-full flex-col rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-line-strong focus-within:border-line-strong md:p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 text-base font-semibold">
          <a href={r.htmlUrl} target="_blank" rel="noopener noreferrer" className="break-all after:absolute after:inset-0 after:rounded-2xl">
            <span className="font-normal text-muted">{owner}/</span>
            {name}
          </a>
        </h3>
        <div className="flex shrink-0 items-center gap-1.5">
          {r.isDemo && <DemoBadge />}
          <BookmarkButton item={repoBookmark(r)} />
        </div>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-fg-2">{r.summaryKo ?? r.description ?? "설명이 없습니다."}</p>
      {r.topics.length > 0 && (
        <div className="-ml-1.5 mt-2 flex flex-wrap">
          {r.topics.map((t) => (
            <TopicTag key={t} slug={t} />
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-3 text-[13px] text-muted">
        <span className="tabular inline-flex items-center gap-1 font-medium text-fg-2" title="총 Stars">
          <Star className="size-4" aria-hidden />
          {r.starsTotal.toLocaleString("ko-KR")}
        </span>
        <span className="tabular inline-flex items-center gap-1" title="Forks">
          <GitFork className="size-4" aria-hidden />
          {formatCount(r.forksTotal)}
        </span>
        <LanguageDot language={r.language} />
        {r.pushedAt && (
          <span>
            push <LocalTime iso={r.pushedAt} />
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          <GrowthBadge repo={r} />
          <ArrowUpRight className="size-4 text-muted transition-colors group-hover:text-fg" aria-label="GitHub에서 열기" />
        </span>
      </div>
    </article>
  );
}
