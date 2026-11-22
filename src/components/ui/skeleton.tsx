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

/** 페이지 머리(작은 제목·큰 제목·설명) */
export function HeaderSkeleton() {
  return (
    <div className="mb-8">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-96 max-w-full" />
    </div>
  );
}

/** 홈 배너 + 대표 카드 + 목록 */
export function HomeSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-label="불러오는 중">
      <div className="rounded-3xl border border-line p-6 md:p-8">
        <Skeleton className="h-7 w-48 rounded-full" />
        <Skeleton className="mt-5 h-9 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-[34rem] max-w-full" />
        <div className="mt-6 flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-line p-6">
          <Skeleton className="mb-4 h-6 w-32 rounded-full" />
          <Skeleton className="mb-2 h-7 w-full" />
          <Skeleton className="mb-5 h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </div>
        <ListSkeleton rows={3} />
      </div>
    </div>
  );
}

/** 상세 페이지: 제목·정보 상자·본문 패널 */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-[780px]" role="status" aria-label="불러오는 중">
      <Skeleton className="mb-6 h-5 w-28" />
      <div className="mb-4 flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="mb-2 h-9 w-full" />
      <Skeleton className="mb-6 h-9 w-3/4" />
      <Skeleton className="mb-6 h-20 w-full rounded-xl" />
      <div className="rounded-2xl border border-line p-6">
        <Skeleton className="mb-4 h-5 w-32" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="mb-2 h-4" />
        ))}
      </div>
    </div>
  );
}

/** 썸네일이 있는 목록(게임) */
export function MediaListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line" role="status" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 p-4">
          <Skeleton className="aspect-[460/215] w-36 shrink-0 rounded-lg md:w-48" />
          <div className="min-w-0 flex-1">
            <Skeleton className="mb-2 h-5 w-1/2" />
            <Skeleton className="mb-2 h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
