import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "./button";

/** cursor(offset) 기반 이전/다음. 현재 쿼리 파라미터를 보존한다. */
export function Pagination({
  basePath,
  params,
  cursor,
  nextCursor,
  limit,
  total,
  shown,
}: {
  basePath: string;
  params: Record<string, string>;
  cursor?: string;
  nextCursor: string | null;
  limit: number;
  total: number | null;
  shown: number;
}) {
  const offset = cursor ? Number(cursor) : 0;
  const href = (c: number | null) => {
    const sp = new URLSearchParams(params);
    sp.delete("cursor");
    if (c) sp.set("cursor", String(c));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };
  if (offset === 0 && !nextCursor) return null;
  return (
    <nav aria-label="페이지 이동" className="mt-6 flex items-center justify-between gap-3">
      <p className="tabular text-[13px] text-muted">
        {offset + 1}–{offset + shown}
        {total !== null && <> / 총 {total.toLocaleString("ko-KR")}건</>}
      </p>
      <div className="flex gap-2">
        {offset > 0 ? (
          <Link href={href(Math.max(0, offset - limit))} className={buttonClass("secondary", "sm")} scroll>
            <ChevronLeft className="size-4" aria-hidden /> 이전
          </Link>
        ) : (
          <span className={buttonClass("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled>
            <ChevronLeft className="size-4" aria-hidden /> 이전
          </span>
        )}
        {nextCursor ? (
          <Link href={href(Number(nextCursor))} className={buttonClass("secondary", "sm")} scroll>
            다음 <ChevronRight className="size-4" aria-hidden />
          </Link>
        ) : (
          <span className={buttonClass("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled>
            다음 <ChevronRight className="size-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
