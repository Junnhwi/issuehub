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

export function TopicTag({ slug, linked = true }: { slug: string; linked?: boolean }) {
  const topic = getTopic(slug);
  if (!topic) return null;
  const cls = "relative z-10 inline-flex h-6 items-center rounded-md px-1.5 text-xs font-medium text-muted transition-colors";
  return linked ? (
    <Link href={`/topics/${slug}`} className={`${cls} hover:bg-hover hover:text-fg`}>
      #{topic.nameKo}
    </Link>
  ) : (
    <span className={cls}>#{topic.nameKo}</span>
  );
}

export function DemoBadge() {
  return (
    <Badge tone="warning" title="가상의 데모 데이터">
      데모
    </Badge>
  );
}
