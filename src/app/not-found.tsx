import { FileQuestion } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      icon={FileQuestion}
      title="페이지를 찾을 수 없습니다"
      description="주소가 바뀌었거나 삭제된 항목일 수 있습니다."
      action={
        <div className="flex gap-2">
          <Link href="/discover" className={buttonClass("primary", "sm")}>
            이슈 탐색
          </Link>
          <Link href="/" className={buttonClass("secondary", "sm")}>
            홈으로
          </Link>
        </div>
      }
    />
  );
}
