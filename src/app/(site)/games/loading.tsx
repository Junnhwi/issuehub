import { HeaderSkeleton, MediaListSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <HeaderSkeleton />
      <MediaListSkeleton rows={5} />
    </div>
  );
}
