import type { Game, GameList, PricePoint, SalePeriod } from "@/types";

export const GAME_LISTS: { slug: GameList; label: string; description: string }[] = [
  { slug: "most_played", label: "지금 많이 하는 게임", description: "Steam 동시접속자 차트 상위(최근 일간 최고 동시접속 기준 순위)" },
  { slug: "top_sellers", label: "최고 인기", description: "Steam 판매 순위(한국 상점 기준)" },
  { slug: "new_releases", label: "인기 신작", description: "Steam '인기 신규 출시' 순위" },
  { slug: "coming_soon", label: "출시 예정", description: "Steam '인기 출시 예정' 순위(관심이 많이 모인 순)" },
];

export const GAME_LIST_SLUGS = GAME_LISTS.map((l) => l.slug) as [GameList, ...GameList[]];

/** 목록 안 정렬: Steam 순위 그대로 */
export function sortGames(items: Game[], list: GameList): Game[] {
  return items.filter((g) => g.ranks[list] !== undefined).sort((a, b) => a.ranks[list]! - b.ranks[list]!);
}

/** Steam 평가 점수(0~9) 구간을 색 톤으로. 평가 없음은 null */
export function reviewTone(percent: number, count: number): "positive" | "mixed" | "negative" | null {
  if (count === 0) return null;
  if (percent >= 70) return "positive";
  if (percent >= 40) return "mixed";
  return "negative";
}

/** Steam의 출시일 표기 정밀도(coming_soon_display)에 맞춘 한국어 표기 */
export function releaseLabel(unix: number | undefined, display: string | undefined, comingSoon: boolean): string | null {
  if (!unix) return comingSoon ? "출시 예정" : null;
  // Steam 상점은 한국어 페이지에서도 출시일을 미국 태평양 시간 기준 날짜로 표기한다
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(unix * 1000)
      .map((p) => [p.type, Number(p.value)]),
  );
  const y = parts.year;
  const m = parts.month;
  if (comingSoon && display === "date_year") return `${y}년 출시 예정`;
  if (comingSoon && display === "date_quarter") return `${y}년 ${Math.ceil(m / 3)}분기 출시 예정`;
  if (comingSoon && display === "date_month") return `${y}년 ${m}월 출시 예정`;
  if (comingSoon && display === "text_comingsoon") return "출시 예정";
  const label = `${y}년 ${m}월 ${parts.day}일`;
  return comingSoon ? `${label} 출시 예정` : `${label} 출시`;
}

/**
 * 가격 변경 기록(시간순)에서 세일 기간을 만든다. 할인율이 0보다 큰 기록이 시작, 다음 기록이 끝.
 * 연속된 할인 기록(할인율만 바뀐 경우)은 각각 별도 기간으로 둔다.
 */
export function salePeriods(points: PricePoint[]): SalePeriod[] {
  const sorted = [...points].sort((a, b) => Date.parse(a.changedAt) - Date.parse(b.changedAt));
  return sorted.flatMap((p, i) =>
    p.cut > 0 ? [{ start: p.changedAt, end: sorted[i + 1]?.changedAt ?? null, cut: p.cut, price: p.price, regular: p.regular }] : [],
  );
}

export const formatWon = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
