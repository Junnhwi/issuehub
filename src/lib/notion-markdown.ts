import { getTopic } from "@/config/topics";
import type { Article } from "@/types";
import { BUZZ_RULES, buzzLevel } from "@/lib/buzz";

const TIER = { official: "공식", community: "커뮤니티", independent: "개인·독립" } as const;
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "정보 없음");
const bullets = (xs: string[]) => xs.map((x) => `- ${x}`).join("\n");

/**
 * 노션에 붙여 넣을 학습 노트 초안(Markdown). 노션은 붙여 넣을 때 제목·목록·인용을 블록으로 바꾼다.
 * AI 요약은 completed일 때만 넣고, 출처를 밝힌다.
 */
export function toNotionMarkdown(a: Article): string {
  const title = a.titleKo ?? a.title;
  const level = buzzLevel(a.popularity, a.commentsCount);
  const reaction = [
    a.popularity !== null ? `점수 ${a.popularity}점` : null,
    a.commentsCount !== null ? `댓글 ${a.commentsCount}개` : null,
  ].filter(Boolean);

  const lines: string[] = [`# ${title}`];
  if (a.titleKo && a.titleKo !== a.title) lines.push(`> 원제: ${a.title}`);
  lines.push(
    "",
    `- 원문: ${a.originalUrl}`,
    ...(a.discussionUrl ? [`- 토론: ${a.discussionUrl}`] : []),
    `- 출처: ${a.source.name} (${TIER[a.source.tier]}) · 게시 ${day(a.publishedAt)}`,
    `- 토픽: ${a.topics.map((t) => getTopic(t)?.nameKo ?? t).join(", ") || "없음"}`,
    ...(reaction.length ? [`- 반응: ${reaction.join(" · ")}${level ? ` (${BUZZ_RULES[level].label})` : ""} · ${day(a.fetchedAt)} 수집 기준`] : []),
  );

  if (a.summaryStatus === "completed" && a.summaryKo) {
    lines.push("", "## 요약 (IssueHub AI 요약 · 원문 확인 필요)", a.summaryKo);
    if (a.keyPoints.length) lines.push("", "### 핵심 포인트", bullets(a.keyPoints));
    if (a.whyItMatters) lines.push("", "### 왜 중요한가", a.whyItMatters);
    if (a.useCases.length) lines.push("", "### 활용 예", bullets(a.useCases));
    if (a.caveats) lines.push("", "### 주의할 점", a.caveats);
  } else if (a.excerptKo ?? a.excerpt) {
    lines.push("", a.excerptKo ? "## 발췌 번역 (AI)" : "## 원문 발췌", `> ${a.excerptKo ?? a.excerpt}`);
  }

  lines.push("", "## 내 메모", "- 왜 관심이 갔나:", "- 새로 알게 된 것:", "- 더 찾아볼 것:");
  return lines.join("\n");
}
