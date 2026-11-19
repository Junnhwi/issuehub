"use client";

import { Link2 } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function CopyLinkButton({ url }: { url: string }) {
  return (
    <button
      type="button"
      className={buttonClass("secondary", "md")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          toast("원문 링크를 복사했습니다");
        } catch {
          toast("클립보드에 접근할 수 없습니다", "error");
        }
      }}
    >
      <Link2 className="size-4" aria-hidden />
      링크 복사
    </button>
  );
}
