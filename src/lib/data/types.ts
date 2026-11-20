import type { Article, Game, GameList, Page, PricePoint, Repository, Source, Stats, TopicWithCounts } from "@/types";
import type { ArticleListParams, RepoListParams } from "@/lib/validation/params";

export interface DataAdapter {
  listArticles(p: ArticleListParams): Promise<Page<Article>>;
  getArticle(id: string): Promise<{ article: Article; related: Article[] } | null>;
  listRepos(p: RepoListParams): Promise<Page<Repository>>;
  getRepo(id: string): Promise<{ repo: Repository; snapshots: { capturedDate: string; starsCount: number }[] } | null>;
  listLanguages(): Promise<string[]>;
  listTopics(): Promise<TopicWithCounts[]>;
  listSources(): Promise<Source[]>;
  getStats(): Promise<Stats>;
  /** Steam 목록 하나(Steam 순위 또는 목록 규칙대로 정렬) */
  listGames(list: GameList): Promise<{ items: Game[]; asOf: string | null }>;
  /** 게임 하나와 한국 Steam 가격 변경 기록(시간순) */
  getGame(appid: number): Promise<{ game: Game; history: PricePoint[] } | null>;
}
