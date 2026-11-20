import { stripHtml } from "../../src/lib/ingestion/normalize";
import { releaseLabel } from "../../src/lib/games";
import type { GameList } from "../../src/types";
import { fetchJson, mapLimit } from "../lib/http";

/**
 * Steam 공개 API(키 불필요)로 게임 동향을 모은다.
 * - 목록: 상점 featuredcategories(최고 인기·신규 출시·곧 출시) + 동시접속자 차트
 * - 상세: IStoreBrowseService/GetItems 한 번에 50개(한국어 설명·평가 요약·태그·가격·출시일·이미지)
 * - 현재 동시접속자: 출시된 게임만 ISteamUserStats/GetNumberOfCurrentPlayers
 */
const STORE = "https://store.steampowered.com";
const API = "https://api.steampowered.com";
const CDN = "https://shared.akamai.steamstatic.com/store_item_assets/";

export interface NormalizedGame {
  appid: number;
  name: string;
  storeUrl: string;
  headerImage: string | null;
  description: string | null;
  /** 원문이 이미 한국어면 그대로, 아니면 null(요약 단계에서 번역) */
  descriptionKo: string | null;
  tags: string[];
  developers: string[];
  releaseAt: string | null;
  releaseLabel: string | null;
  comingSoon: boolean;
  isFree: boolean;
  price: string | null;
  discountPct: number | null;
  reviewLabel: string | null;
  reviewPercent: number | null;
  reviewCount: number | null;
  currentPlayers: number | null;
  peakPlayers: number | null;
  ranks: Partial<Record<GameList, number>>;
}

interface FeaturedItem {
  id: number;
  type: number;
}
type Featured = Record<string, { items?: FeaturedItem[] } | unknown>;

export interface StoreItem {
  appid: number;
  name: string;
  type: number;
  success: number;
  visible?: boolean;
  is_free?: boolean;
  basic_info?: { short_description?: string; developers?: { name: string }[] };
  release?: { steam_release_date?: number; is_coming_soon?: boolean; coming_soon_display?: string };
  reviews?: { summary_filtered?: { review_count: number; percent_positive: number; review_score_label: string } };
  tagids?: number[];
  tags?: { tagid: number; weight: number }[];
  assets?: { asset_url_format?: string; header?: string };
  best_purchase_option?: { formatted_final_price?: string; discount_pct?: number; is_free?: boolean };
}

const hasHangul = (s: string) => /[가-힣]/.test(s);

/** GetItems 한 항목 → 저장 형태. 게임(type 0)이 아니거나 비공개면 null */
export function normalizeStoreItem(item: StoreItem, tagNames: Map<number, string>, ranks: NormalizedGame["ranks"], peak: number | null): NormalizedGame | null {
  if (!item || item.success !== 1 || item.visible === false || item.type !== 0 || !item.name) return null;
  const description = stripHtml(item.basic_info?.short_description, 600);
  const review = item.reviews?.summary_filtered;
  const assets = item.assets;
  const release = item.release ?? {};
  const comingSoon = !!release.is_coming_soon;
  const isFree = !!(item.is_free || item.best_purchase_option?.is_free);
  return {
    appid: item.appid,
    name: item.name.slice(0, 200),
    storeUrl: `${STORE}/app/${item.appid}/`,
    headerImage: assets?.asset_url_format && assets.header ? CDN + assets.asset_url_format.replace("${FILENAME}", assets.header) : null,
    description,
    descriptionKo: description && hasHangul(description) ? description : null,
    tags: (item.tags ?? []).map((t) => tagNames.get(t.tagid)).filter((t): t is string => !!t).slice(0, 5),
    developers: (item.basic_info?.developers ?? []).map((d) => d.name).slice(0, 3),
    releaseAt: release.steam_release_date ? new Date(release.steam_release_date * 1000).toISOString() : null,
    releaseLabel: releaseLabel(release.steam_release_date, release.coming_soon_display, comingSoon),
    comingSoon,
    isFree,
    price: isFree ? "무료" : (item.best_purchase_option?.formatted_final_price ?? null),
    discountPct: item.best_purchase_option?.discount_pct || null,
    reviewLabel: review && review.review_count > 0 ? review.review_score_label : null,
    reviewPercent: review && review.review_count > 0 ? review.percent_positive : null,
    reviewCount: review ? review.review_count : null,
    currentPlayers: null,
    peakPlayers: peak,
    ranks,
  };
}

async function fetchTagNames(): Promise<Map<number, string>> {
  const res = await fetchJson<{ response: { tags: { tagid: number; name: string }[] } }>(`${API}/IStoreService/GetTagList/v1/?language=koreana`);
  return new Map(res.response.tags.map((t) => [t.tagid, t.name]));
}

async function fetchItems(appids: number[]): Promise<StoreItem[]> {
  const out: StoreItem[] = [];
  for (let i = 0; i < appids.length; i += 50) {
    const input = {
      ids: appids.slice(i, i + 50).map((appid) => ({ appid })),
      context: { language: "koreana", country_code: "KR" },
      data_request: { include_assets: true, include_basic_info: true, include_release: true, include_reviews: true, include_tag_count: 8, include_all_purchase_options: true },
    };
    const res = await fetchJson<{ response: { store_items?: StoreItem[] } }>(`${API}/IStoreBrowseService/GetItems/v1/?input_json=${encodeURIComponent(JSON.stringify(input))}`);
    out.push(...(res.response.store_items ?? []));
  }
  return out;
}

async function currentPlayers(appid: number): Promise<number | null> {
  try {
    const res = await fetchJson<{ response: { player_count?: number; result: number } }>(`${API}/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=${appid}`, undefined, { retries: 1, timeoutMs: 6000 });
    return res.response.result === 1 ? (res.response.player_count ?? null) : null;
  } catch {
    return null;
  }
}

/** 목록별 순위를 모은다(같은 목록 안 중복 제거, 1부터) */
export function collectRanks(featured: Featured, mostPlayed: { appid: number }[], limit: number) {
  const ranks = new Map<number, NormalizedGame["ranks"]>();
  const add = (list: GameList, ids: number[]) => {
    [...new Set(ids)].slice(0, limit).forEach((id, i) => ranks.set(id, { ...ranks.get(id), [list]: i + 1 }));
  };
  const ids = (key: string) => (((featured[key] as { items?: FeaturedItem[] } | undefined)?.items ?? []).filter((x) => x.type === 0).map((x) => x.id));
  add("most_played", mostPlayed.map((r) => r.appid));
  add("top_sellers", ids("top_sellers"));
  add("new_releases", ids("new_releases"));
  add("coming_soon", ids("coming_soon"));
  return ranks;
}

export async function fetchSteamGames(limit: number): Promise<NormalizedGame[]> {
  const [featured, chart, tagNames] = await Promise.all([
    fetchJson<Featured>(`${STORE}/api/featuredcategories?cc=kr&l=koreana`),
    fetchJson<{ response: { ranks?: { appid: number; peak_in_game: number }[] } }>(`${API}/ISteamChartsService/GetMostPlayedGames/v1/`),
    fetchTagNames(),
  ]);
  const chartRanks = chart.response.ranks ?? [];
  const peaks = new Map(chartRanks.map((r) => [r.appid, r.peak_in_game]));
  const ranks = collectRanks(featured, chartRanks, limit);
  const items = await fetchItems([...ranks.keys()]);
  const games = items
    .map((it) => normalizeStoreItem(it, tagNames, ranks.get(it.appid) ?? {}, peaks.get(it.appid) ?? null))
    .filter((g): g is NormalizedGame => !!g);
  await mapLimit(games, 6, async (g) => {
    if (!g.comingSoon) g.currentPlayers = await currentPlayers(g.appid);
  });
  return games;
}
