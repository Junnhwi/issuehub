import type { Game, GameList } from "@/types";

export const GAME_LISTS: { slug: GameList; label: string; description: string }[] = [
  { slug: "most_played", label: "지금 많이 하는 게임", description: "Steam 동시접속자 차트 상위(최근 일간 최고 동시접속 기준 순위)" },
  { slug: "top_sellers", label: "최고 인기", description: "Steam 상점 '최고 인기 게임'(판매 기준) 목록" },
  { slug: "new_releases", label: "신규 출시", description: "Steam 상점 '신규 출시 게임'. 평가가 많은 순으로 정렬" },
  { slug: "coming_soon", label: "출시 예정", description: "Steam 상점 '곧 출시' 목록" },
];

export const GAME_LIST_SLUGS = GAME_LISTS.map((l) => l.slug) as [GameList, ...GameList[]];

/** 목록 안 정렬: 신규 출시는 평가 수(주목도) 순, 나머지는 Steam 순위 그대로 */
export function sortGames(items: Game[], list: GameList): Game[] {
  const inList = items.filter((g) => g.ranks[list] !== undefined);
  if (list === "new_releases") return inList.sort((a, b) => (b.review?.count ?? -1) - (a.review?.count ?? -1) || a.ranks[list]! - b.ranks[list]!);
  return inList.sort((a, b) => a.ranks[list]! - b.ranks[list]!);
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
