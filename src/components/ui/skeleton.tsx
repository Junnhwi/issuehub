import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

/** 실제 리스트 행과 같은 높이·구조의 스켈레톤 */
export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface" role="status" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="px-4 py-4 md:px-5 md:py-5">
          <Skeleton className="mb-2.5 h-3.5 w-40" />
          <Skeleton className="mb-2 h-5 w-4/5" />
          <Skeleton className="h-4 w-full max-w-[72ch]" />
          <Skeleton className="mt-1.5 h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
