import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("skeleton", className)} />;
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="불러오는 중">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-5">
          <Skeleton className="mb-3 h-4 w-32" />
          <Skeleton className="mb-2 h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}
