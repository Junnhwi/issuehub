import { describe, expect, it } from "vitest";
import { releaseLabel, reviewTone, sortGames } from "@/lib/games";
import { collectRanks, normalizeStoreItem, searchAppids, type StoreItem } from "../scripts/sources/steam";
import type { Game } from "@/types";

const game = (over: Partial<Game>): Game => ({
  appid: 1, name: "g", storeUrl: "u", headerImage: null, description: null, descriptionKo: null, tags: [], developers: [], releaseAt: null,
  releaseLabel: null, comingSoon: false, isFree: false, price: null, discountPct: null, review: null, currentPlayers: null, peakPlayers: null,
  ranks: {}, lastSyncedAt: "2026-11-20T00:00:00Z", isDemo: false, ...over,
});

describe("steam store item normalization", () => {
  const tags = new Map([[122, "RPG"], [19, "액션"]]);
  const item: StoreItem = {
    appid: 10, name: "Test Game", type: 0, success: 1, visible: true,
    basic_info: { short_description: "A tale of &amp; heroes", developers: [{ name: "Studio" }] },
    release: { steam_release_date: 1763510400 },
    reviews: { summary_filtered: { review_count: 120, percent_positive: 88, review_score_label: "매우 긍정적" } },
    tags: [{ tagid: 122, weight: 9 }, { tagid: 999, weight: 1 }, { tagid: 19, weight: 5 }],
    assets: { asset_url_format: "steam/apps/10/${FILENAME}?t=1", header: "header.jpg" },
    best_purchase_option: { formatted_final_price: "₩ 10,000", discount_pct: 0 },
  };
  it("keeps Steam values as given and marks English descriptions for translation", () => {
    const g = normalizeStoreItem(item, tags, { top_sellers: 2 }, null)!;
    expect(g).toMatchObject({
      storeUrl: "https://store.steampowered.com/app/10/",
      headerImage: "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/10/header.jpg?t=1",
      description: "A tale of & heroes", descriptionKo: null, tags: ["RPG", "액션"], price: "₩ 10,000", discountPct: null,
      reviewLabel: "매우 긍정적", reviewPercent: 88, reviewCount: 120, ranks: { top_sellers: 2 },
    });
  });
  it("uses Korean descriptions directly, and has no review numbers when there are no reviews", () => {
    const g = normalizeStoreItem({ ...item, basic_info: { short_description: "한국어 설명" }, reviews: { summary_filtered: { review_count: 0, percent_positive: 0, review_score_label: "사용자 평가 없음" } } }, tags, {}, null)!;
    expect(g.descriptionKo).toBe("한국어 설명");
    expect([g.reviewLabel, g.reviewPercent, g.reviewCount]).toEqual([null, null, 0]);
  });
  it("drops non-games and hidden items", () => {
    expect(normalizeStoreItem({ ...item, type: 4 }, tags, {}, null)).toBeNull();
    expect(normalizeStoreItem({ ...item, success: 2 }, tags, {}, null)).toBeNull();
  });
  it("ranks each list from 1, skipping non-game entries and duplicates", () => {
    const featured = { top_sellers: { items: [{ id: 5, type: 0 }, { id: 5, type: 0 }, { id: 6, type: 1 }, { id: 7, type: 0 }] } };
    const ranks = collectRanks(featured, [{ appid: 7 }], 30);
    expect(ranks.get(5)).toEqual({ top_sellers: 1 });
    expect(ranks.get(7)).toEqual({ most_played: 1, top_sellers: 2 });
    expect(ranks.has(6)).toBe(false);
  });
  it("prefers the store search lists and reads appids from their image urls", () => {
    const ids = searchAppids([{ logo: "https://x/steam/apps/3321460/abc/capsule_sm_120.jpg?t=1" }, { logo: "https://x/no-id.jpg" }, {}]);
    expect(ids).toEqual([3321460]);
    const ranks = collectRanks({ coming_soon: { items: [{ id: 9, type: 0 }] } }, [], 30, { coming_soon: [11, 12] });
    expect([ranks.get(11), ranks.get(12), ranks.has(9)]).toEqual([{ coming_soon: 1 }, { coming_soon: 2 }, false]);
  });
});

describe("game helpers", () => {
  it("formats release dates like the Steam store (Pacific date, Steam precision)", () => {
    expect(releaseLabel(1795154400, "date_full", true)).toBe("2026년 11월 19일 출시 예정");
    expect(releaseLabel(1795154400, "date_quarter", true)).toBe("2026년 4분기 출시 예정");
    expect(releaseLabel(undefined, undefined, true)).toBe("출시 예정");
    expect(releaseLabel(1763510400, undefined, false)).toBe("2025년 11월 18일 출시");
  });
  it("sorts each list by Steam rank", () => {
    const items = [
      game({ appid: 1, ranks: { new_releases: 1, top_sellers: 2 }, review: { label: "x", percent: 90, count: 5 } }),
      game({ appid: 2, ranks: { new_releases: 2, top_sellers: 1 }, review: { label: "x", percent: 90, count: 500 } }),
      game({ appid: 3, ranks: { coming_soon: 1 } }),
    ];
    expect(sortGames(items, "new_releases").map((g) => g.appid)).toEqual([1, 2]);
    expect(sortGames(items, "top_sellers").map((g) => g.appid)).toEqual([2, 1]);
  });
  it("maps review percent to a tone, with no tone when there are no reviews", () => {
    expect([reviewTone(85, 10), reviewTone(55, 10), reviewTone(20, 10), reviewTone(0, 0)]).toEqual(["positive", "mixed", "negative", null]);
  });
});
