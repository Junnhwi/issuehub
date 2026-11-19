import { AlertTriangle, CircleDashed, CircleSlash, PenLine, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { getTopic } from "@/config/topics";
import type { SourceKind, SourceTier, SummaryStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

const TIER = {
  official: { label: "공식 출처", icon: ShieldCheck, tone: "success" },
  community: { label: "커뮤니티", icon: Users, tone: "neutral" },
  independent: { label: "개인·독립", icon: PenLine, tone: "neutral" },
} as const;

export function TierBadge({ tier }: { tier: SourceTier }) {
  const t = TIER[tier];
  return (
    <Badge tone={t.tone} title="출처 유형(신뢰도 점수가 아닙니다)">
      <t.icon className="size-3.5" aria-hidden />
      {t.label}
    </Badge>
  );
}

export function SummaryStatusBadge({ status, sourceKind }: { status: SummaryStatus; sourceKind: SourceKind }) {
  if (status === "completed") {
    return sourceKind === "demo" ? (
      <Badge tone="warning" title="UI 시연용으로 사람이 작성한 예시 텍스트입니다">
        <Sparkles className="size-3.5" aria-hidden />
        예시 요약
      </Badge>
    ) : (
      <Badge tone="accent">
        <Sparkles className="size-3.5" aria-hidden />
        AI 요약
      </Badge>
    );
  }
  if (status === "pending")
    return (
      <Badge>
        <CircleDashed className="size-3.5" aria-hidden />
        요약 대기
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge tone="danger">
        <AlertTriangle className="size-3.5" aria-hidden />
        요약 실패
      </Badge>
    );
  return (
    <Badge>
      <CircleSlash className="size-3.5" aria-hidden />
      요약 없음
    </Badge>
  );
}

/** 토픽 칩: 색 점 + 이름. 색은 구분 보조일 뿐 이름이 항상 함께 나온다. */
export function TopicTag({ slug, linked = true, size = "sm" }: { slug: string; linked?: boolean; size?: "sm" | "md" }) {
  const topic = getTopic(slug);
  if (!topic) return null;
  const cls = `relative z-10 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-elevated/60 font-medium text-fg-2 transition-colors ${
    size === "md" ? "h-8 px-3 text-[13px]" : "h-6 px-2.5 text-[12px]"
  }`;
  const body = (
    <>
      <span className="size-2 rounded-full" style={{ background: topic.color }} aria-hidden />
      {topic.nameKo}
    </>
  );
  return linked ? (
    <Link href={`/topics/${slug}`} className={`${cls} hover:border-line-strong hover:text-fg`}>
      {body}
    </Link>
  ) : (
    <span className={cls}>{body}</span>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="warning" title="가상의 데모 데이터">
      데모
    </Badge>
  );
}
