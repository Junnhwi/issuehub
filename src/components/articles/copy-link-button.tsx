"use client";

import { Link2, NotebookPen } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const KINDS = {
  link: { icon: Link2, label: "링크 복사", done: "원문 링크를 복사했습니다" },
  note: { icon: NotebookPen, label: "노션용 복사", done: "노트 초안을 복사했습니다. 노션에 붙여 넣으세요" },
} as const;

/** 클립보드 복사 버튼. note는 노션에 붙여 넣을 Markdown 노트 초안 */
export function CopyLinkButton({ text, kind = "link" }: { text: string; kind?: keyof typeof KINDS }) {
  const k = KINDS[kind];
  return (
    <button
      type="button"
      className={buttonClass("secondary", "md")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          toast(k.done);
        } catch {
          toast("클립보드에 접근할 수 없습니다", "error");
        }
      }}
    >
      <k.icon className="size-4" aria-hidden />
      {k.label}
    </button>
  );
}
