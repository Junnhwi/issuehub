import Link from "next/link";
import type { TopicWithCounts } from "@/types";
import { cn, formatCount } from "@/lib/utils";

/**
 * 토픽 빠른 필터. 다른 검색 조건은 유지하고 cursor만 초기화한다.
 * 모바일에서는 가로 스크롤.
 */
export function TopicFilter({
  basePath,
  params,
  topics,
  active,
  countKey,
}: {
  basePath: string;
  params: Record<string, string>;
  topics: TopicWithCounts[];
  active?: string;
  countKey: "articleCount" | "repoCount";
}) {
  const href = (slug?: string) => {
    const sp = new URLSearchParams(params);
    sp.delete("cursor");
    if (slug) sp.set("topic", slug);
    else sp.delete("topic");
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  const chip = "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-medium transition-colors md:h-9";

  return (
    <nav aria-label="토픽 필터" className="-mx-4 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
      <ul className="flex gap-1.5 md:flex-wrap [&>li]:shrink-0">
        <li>
          <Link
            href={href()}
            scroll={false}
            aria-current={!active ? "true" : undefined}
            className={cn(chip, !active ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg")}
          >
            전체
          </Link>
        </li>
        {topics.map((t) => {
          const on = active === t.slug;
          return (
            <li key={t.slug}>
              <Link
                href={href(t.slug)}
                scroll={false}
                aria-current={on ? "true" : undefined}
                className={cn(chip, on ? "border-transparent bg-fg text-bg" : "border-line bg-surface text-fg-2 hover:border-line-strong hover:text-fg")}
              >
                <span className="size-2 rounded-full" style={{ background: t.color }} aria-hidden />
                {t.nameKo}
                <span className={cn("tabular font-mono text-[12px]", on ? "opacity-70" : "text-muted")}>{formatCount(t[countKey])}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
