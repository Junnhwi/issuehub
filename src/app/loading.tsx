import { ListSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-8 w-64" />
      <Skeleton className="mb-8 h-4 w-96 max-w-full" />
      <ListSkeleton rows={5} />
    </div>
  );
}
