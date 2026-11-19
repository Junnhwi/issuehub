"use client";

import { ArrowUpRight, BookmarkX, FileText, FolderGit2, Info, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { getTopic } from "@/config/topics";
import { clearBookmarks, removeBookmark, useBookmarks, type BookmarkType } from "@/lib/bookmarks/store";
import { cn, formatDate } from "@/lib/utils";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";

export function SavedView() {
  const all = useBookmarks();
  const [tab, setTab] = useState<BookmarkType>("article");
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");

  const counts = { article: all.filter((b) => b.type === "article").length, repo: all.filter((b) => b.type === "repo").length };
  const topics = useMemo(() => [...new Set(all.filter((b) => b.type === tab).flatMap((b) => b.tags))], [all, tab]);
  const items = all.filter(
    (b) =>
      b.type === tab &&
      (!topic || b.tags.includes(topic)) &&
      (!query || `${b.title} ${b.subtitle ?? ""}`.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div>
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-line bg-surface/60 px-4 py-3 text-[13px] leading-relaxed text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-fg" aria-hidden />
        <p>
          저장 목록은 <strong className="font-semibold text-fg-2">이 브라우저의 localStorage</strong>에만 보관됩니다. 다른 기기와 동기화되지 않고, 브라우저 데이터를 지우면 사라집니다.
          계정 기반 저장과 Notion 내보내기는 다음 단계에서 제공할 예정이며 아직 지원하지 않습니다.
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="저장 항목 종류" className="inline-flex rounded-xl border border-line bg-surface p-1">
          {(
            [
              ["article", "기사", FileText],
              ["repo", "저장소", FolderGit2],
            ] as const
          ).map(([value, label, Icon]) => (
            <button
              key={value}
              role="tab"
              type="button"
              aria-selected={tab === value}
              onClick={() => {
                setTab(value);
                setTopic("");
              }}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
                tab === value ? "bg-elevated text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted hover:text-fg",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              <span className="tabular text-xs text-muted">{counts[value]}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="저장 목록에서 찾기"
            aria-label="저장 목록에서 찾기"
            className="h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm outline-none placeholder:text-muted focus:border-accent sm:w-52"
          />
          {topics.length > 0 && (
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              aria-label="토픽 필터"
              className="h-10 rounded-xl border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
            >
              <option value="">토픽: 전체</option>
              {topics.map((t) => (
                <option key={t} value={t}>
                  {getTopic(t)?.nameKo ?? t}
                </option>
              ))}
            </select>
          )}
          {all.length > 0 && (
            <button
              type="button"
              className={buttonClass("ghost", "sm")}
              onClick={() => {
                if (confirm("이 브라우저에 저장한 모든 항목을 삭제할까요? 되돌릴 수 없습니다.")) {
                  clearBookmarks();
                  toast("저장 목록을 비웠습니다");
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              전체 삭제
            </button>
          )}
        </div>
      </div>

      {items.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {items.map((b) => (
            <li key={`${b.type}:${b.id}`} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                {b.href ? (
                  <Link href={b.href} className="line-clamp-2 font-medium hover:text-accent-fg">
                    {b.title}
                  </Link>
                ) : (
                  <a href={b.url} target="_blank" rel="noopener noreferrer" className="line-clamp-2 break-all font-medium hover:text-accent-fg">
                    {b.title}
                  </a>
                )}
                <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
                  {b.subtitle && <span className="line-clamp-1">{b.subtitle}</span>}
                  <span aria-hidden>·</span>
                  <span>저장 {formatDate(b.savedAt)}</span>
                </p>
              </div>
              <a href={b.url} target="_blank" rel="noopener noreferrer" className="grid size-10 shrink-0 place-items-center rounded-lg border border-line text-muted hover:text-fg" aria-label="원문 열기 (새 창)">
                <ArrowUpRight className="size-4" aria-hidden />
              </a>
              <button
                type="button"
                onClick={() => {
                  removeBookmark(b.type, b.id);
                  toast("저장을 해제했습니다");
                }}
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-line text-muted hover:border-danger/40 hover:text-danger"
                aria-label={`${b.title} 저장 해제`}
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={BookmarkX}
          title={all.length ? "조건에 맞는 저장 항목이 없습니다" : "아직 저장한 항목이 없습니다"}
          description={all.length ? "검색어나 토픽 필터를 바꿔 보세요." : "기사나 저장소 카드의 북마크 버튼을 눌러 저장하세요."}
          action={
            !all.length && (
              <Link href="/discover" className={buttonClass("secondary", "sm")}>
                이슈 둘러보기
              </Link>
            )
          }
        />
      )}
    </div>
  );
}
