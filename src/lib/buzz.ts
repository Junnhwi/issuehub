/**
 * 화제도: 출처가 공개한 반응 수치(HN 점수·댓글 수)를 그대로 구간으로 나눈 것.
 * 가중치를 섞은 자체 점수는 만들지 않는다(설명 가능한 기준만).
 */
export type BuzzLevel = "hot" | "rising";

export const BUZZ_RULES = {
  hot: { points: 300, comments: 150, label: "큰 화제" },
  rising: { points: 100, comments: 50, label: "화제" },
} as const;

export function buzzLevel(points: number | null, comments: number | null): BuzzLevel | null {
  const p = points ?? 0;
  const c = comments ?? 0;
  if (p >= BUZZ_RULES.hot.points || c >= BUZZ_RULES.hot.comments) return "hot";
  if (p >= BUZZ_RULES.rising.points || c >= BUZZ_RULES.rising.comments) return "rising";
  return null;
}

export const BUZZ_EXPLAIN = `Hacker News 점수 ${BUZZ_RULES.hot.points}점 또는 댓글 ${BUZZ_RULES.hot.comments}개 이상이면 '큰 화제', ${BUZZ_RULES.rising.points}점 또는 ${BUZZ_RULES.rising.comments}개 이상이면 '화제'. IssueHub가 마지막으로 수집한 시점의 값입니다.`;
