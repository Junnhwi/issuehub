export interface NormalizedArticle {
  sourceItemId: string | null;
  originalUrl: string;
  normalizedUrl: string;
  title: string;
  excerpt: string | null;
  publishedAt: string | null;
  popularity: number | null;
  /** 댓글 수(예: HN descendants). 없으면 null */
  commentsCount: number | null;
  topics: string[];
  relevanceScore: number | null;
}

export interface NormalizedRepo {
  githubId: number;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  githubTopics: string[];
  topicSlugs: string[];
  stars: number;
  forks: number;
  pushedAt: string | null;
  createdAt: string | null;
}

/** 같은 정규화 URL은 하나만 남긴다(인기 지표가 큰 쪽 우선) */
export function dedupeArticles(items: NormalizedArticle[]): NormalizedArticle[] {
  const map = new Map<string, NormalizedArticle>();
  for (const item of items) {
    const prev = map.get(item.normalizedUrl);
    if (!prev || (item.popularity ?? -1) > (prev.popularity ?? -1)) map.set(item.normalizedUrl, item);
  }
  return [...map.values()];
}
