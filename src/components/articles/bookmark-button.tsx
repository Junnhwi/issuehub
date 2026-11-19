"use client";

import { Bookmark as BookmarkIcon, BookmarkCheck } from "lucide-react";
import { isSaved, toggleBookmark, useBookmarks, type Bookmark } from "@/lib/bookmarks/store";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

export function BookmarkButton({ item, withLabel = false, ghost = false, className }: { item: Omit<Bookmark, "savedAt">; withLabel?: boolean; ghost?: boolean; className?: string }) {
  const list = useBookmarks();
  const saved = isSaved(list, item.type, item.id);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "저장 해제" : "저장하기"}
      title={saved ? "저장 해제" : "저장하기"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const result = toggleBookmark(item);
        if (result === null) toast("브라우저 저장소를 사용할 수 없습니다", "error");
        else toast(result ? "저장했습니다 · Saved에서 확인" : "저장을 해제했습니다");
      }}
      className={cn(
        "relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-[0.96]",
        withLabel ? "h-11 px-4 md:h-10" : "size-11 md:size-9",
        saved
          ? "border-transparent bg-accent-soft text-accent-fg"
          : ghost
            ? "border-transparent text-muted hover:bg-elevated hover:text-fg"
            : "border-line bg-surface text-muted hover:border-line-strong hover:text-fg",
        className,
      )}
    >
      {saved ? <BookmarkCheck className="size-4" aria-hidden /> : <BookmarkIcon className="size-4" aria-hidden />}
      {withLabel && <span>{saved ? "저장됨" : "저장"}</span>}
    </button>
  );
}
