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
  /** 평가가 하나도 없으면 null */
  review: GameReview | null;
  currentPlayers: number | null;
  peakPlayers: number | null;
  /** 마지막 수집 기준 목록별 순위 */
  ranks: Partial<Record<GameList, number>>;
  lastSyncedAt: string;
  isDemo: boolean;
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
