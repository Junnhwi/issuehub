"use client";

import { RefreshCw, ServerCrash } from "lucide-react";
import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <EmptyState
      icon={ServerCrash}
      title="데이터를 불러오지 못했습니다"
      description={
        <>
          일시적인 문제일 수 있습니다. 잠시 후 다시 시도해 주세요.
          {error.digest && <span className="mt-2 block font-mono text-xs">오류 ID: {error.digest}</span>}
        </>
      }
      action={
        <div className="flex gap-2">
          <button type="button" onClick={reset} className={buttonClass("primary", "sm")}>
            <RefreshCw className="size-4" aria-hidden />
            다시 시도
          </button>
          <Link href="/" className={buttonClass("secondary", "sm")}>
            홈으로
          </Link>
        </div>
      }
    />
  );
}
