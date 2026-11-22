export type SourceTier = "official" | "community" | "independent";
export type SourceKind = "github" | "hackernews" | "rss" | "steam" | "demo";
export type SummaryStatus = "pending" | "completed" | "failed" | "skipped";
export type DataMode = "demo" | "live";

export interface SourceRef {
  slug: string;
  name: string;
  kind: SourceKind;
  tier: SourceTier;
  homepageUrl: string | null;
}

export interface Source extends SourceRef {
  id: string;
  feedUrl: string | null;
  enabled: boolean;
  lastFetchedAt: string | null;
}

export interface Topic {
  slug: string;
  nameKo: string;
  /** 토픽 구분용 점 색(글자색으로 쓰지 않음) */
  color: string;
  description: string;
  keywords: string[];
  /** 혼자서는 태깅하지 않는 범용 단어 */
  weakKeywords?: string[];
  /** 제목에 있을 때만 태깅하는 단어 */
  titleKeywords?: string[];
}

export interface TopicWithCounts extends Topic {
  articleCount: number | null;
  repoCount: number | null;
}

export interface Article {
  id: string;
  title: string;
  titleKo: string | null;
  excerpt: string | null;
  /** 발췌의 한국어 번역(AI). 요약과 별개 */
  excerptKo: string | null;
  summaryKo: string | null;
  keyPoints: string[];
  whyItMatters: string | null;
  useCases: string[];
  caveats: string | null;
  summaryStatus: SummaryStatus;
  originalUrl: string;
  /** 커뮤니티 토론 페이지(예: HN 댓글). 원문과 같거나 없으면 null */
  discussionUrl: string | null;
  source: SourceRef;
  topics: string[];
  /** 출처가 제공한 인기 지표(예: HN points). 없으면 null */
  popularity: number | null;
  /** 출처가 제공한 댓글 수(예: HN 댓글). 없으면 null */
  commentsCount: number | null;
  /** 토픽 키워드 매칭 기반 연관도. 계산 불가 시 null */
  relevanceScore: number | null;
  publishedAt: string | null;
  fetchedAt: string;
  summarizedAt: string | null;
}

export interface StarGrowth {
  delta: number;
  fromDate: string;
  toDate: string;
}

export interface Repository {
  id: string;
  githubId: number;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  summaryKo: string | null;
  language: string | null;
  topics: string[];
  githubTopics: string[];
  starsTotal: number;
  forksTotal: number;
  pushedAt: string | null;
  repoCreatedAt: string | null;
  lastSyncedAt: string;
  /** 서로 다른 날짜의 스냅샷이 2개 이상일 때만 값이 있음 */
  growth: StarGrowth | null;
  isDemo: boolean;
}

export type GameList = "most_played" | "top_sellers" | "new_releases" | "coming_soon";

export interface GameReview {
  /** Steam 표기 그대로(예: "매우 긍정적") */
  label: string;
  percent: number;
  count: number;
}

export interface Game {
  appid: number;
  name: string;
  storeUrl: string;
  headerImage: string | null;
  description: string | null;
  /** 한국어 설명(Steam 한국어 설명 또는 AI 번역). 없으면 null */
  descriptionKo: string | null;
  tags: string[];
  developers: string[];
  releaseAt: string | null;
  releaseLabel: string | null;
  comingSoon: boolean;
  isFree: boolean;
  price: string | null;
  discountPct: number | null;
  /** Steam이 알려 준 현재 세일 종료 시각. 세일 중이 아니면 null */
  discountEndsAt: string | null;
  /** 평가가 하나도 없으면 null */
  review: GameReview | null;
  currentPlayers: number | null;
  peakPlayers: number | null;
  /** 마지막 수집 기준 목록별 순위 */
  ranks: Partial<Record<GameList, number>>;
  lastSyncedAt: string;
  isDemo: boolean;
}

/** 가격 변경 기록: changedAt부터 다음 기록 전까지 이 가격이 적용됨 */
export interface PricePoint {
  changedAt: string;
  price: number;
  regular: number;
  cut: number;
  currency: string;
}

export interface SalePeriod {
  start: string;
  /** 진행 중이면 null */
  end: string | null;
  /** 세일 중 가장 큰 할인율(중간에 할인율이 바뀌면 minCut과 다름) */
  cut: number;
  minCut: number;
  /** 세일 중 가장 낮은 가격 */
  price: number;
  regular: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  total: number | null;
  asOf: string | null;
}

export interface Stats {
  mode: DataMode;
  articlesLast24h: number | null;
  reposTotal: number | null;
  summariesCompleted: number | null;
  lastSuccessfulSyncAt: string | null;
  basis: string;
}
