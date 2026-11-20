import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchJson, HttpError } from "../lib/http";

/**
 * IsThereAnyDeal API로 Steam 한국(KR) 가격 이력을 모은다. https://docs.isthereanydeal.com/
 * - appid → ITAD id: POST /lookup/id/shop/61/v1 (키 불필요)
 * - 이력: GET /games/history/v2?id&country=KR&shops=61&since (API 키 필요)
 * 약관: 공개 앱 사용 가능, ITAD 출처 표기 권장, 제공 데이터 변경 금지. 한도: 5분에 1000회(초과 시 429 + Retry-After).
 */
const API = "https://api.isthereanydeal.com";
const STEAM_SHOP = 61;
/** 처음 가져올 때는 ITAD가 가진 가장 오래된 기록부터(기본값은 최근 3개월뿐) */
const FIRST_SINCE = "2010-01-01T00:00:00Z";

interface ItadPrice {
  amount: number;
  currency: string;
}
export interface ItadHistoryEntry {
  timestamp: string;
  shop: { id: number; name: string };
  deal: { price: ItadPrice; regular: ItadPrice; cut: number } | null;
}

export interface PriceRow {
  appid: number;
  changed_at: string;
  price: number;
  regular: number;
  cut: number;
  currency: string;
}

/** ITAD 응답 → 저장 행. Steam 상점 기록만, 가격이 없는(판매 중단) 기록은 제외. 값은 그대로 */
export function toPriceRows(appid: number, entries: ItadHistoryEntry[]): PriceRow[] {
  return entries
    .filter((e) => e.shop?.id === STEAM_SHOP && e.deal)
    .map((e) => ({
      appid,
      changed_at: new Date(e.timestamp).toISOString(),
      price: e.deal!.price.amount,
      regular: e.deal!.regular.amount,
      cut: e.deal!.cut,
      currency: e.deal!.price.currency,
    }));
}

async function lookupItadIds(appids: number[]): Promise<Map<number, string>> {
  const res = await fetchJson<Record<string, string | null>>(`${API}/lookup/id/shop/${STEAM_SHOP}/v1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(appids.map((a) => `app/${a}`)),
  });
  const out = new Map<number, string>();
  for (const [k, v] of Object.entries(res)) if (v) out.set(Number(k.replace("app/", "")), v);
  return out;
}

async function fetchHistory(itadId: string, key: string, since: string): Promise<ItadHistoryEntry[]> {
  const qs = new URLSearchParams({ id: itadId, country: "KR", shops: String(STEAM_SHOP), since });
  return fetchJson<ItadHistoryEntry[]>(`${API}/games/history/v2?${qs}`, { headers: { "ITAD-API-Key": key } });
}

/**
 * 유료·출시된 게임 중 이력이 없거나 12시간 넘게 지난 것만 갱신(요청 수 절약).
 * 두 번째부터는 마지막 기록 이후 변경만 받는다.
 */
export async function syncPriceHistory(db: SupabaseClient, key: string, maxGames = 40) {
  const staleBefore = new Date(Date.now() - 12 * 3600_000).toISOString();
  const { data: games, error } = await db
    .from("games")
    .select("appid, itad_id")
    .eq("is_free", false)
    .eq("coming_soon", false)
    .or(`price_history_synced_at.is.null,price_history_synced_at.lt.${staleBefore}`)
    .not("ranks", "eq", "{}")
    .limit(maxGames);
  if (error) throw new Error(`DB_GAMES:${error.code}`);
  const rows = games ?? [];

  const missing = rows.filter((g) => !g.itad_id).map((g) => g.appid);
  const ids = missing.length ? await lookupItadIds(missing) : new Map<number, string>();
  let synced = 0;
  let points = 0;
  let failed = 0;

  for (const g of rows) {
    const itadId: string | undefined = g.itad_id ?? ids.get(g.appid);
    const now = new Date().toISOString();
    if (!itadId) {
      await db.from("games").update({ price_history_synced_at: now }).eq("appid", g.appid); // ITAD에 없는 게임
      continue;
    }
    const { data: last } = await db.from("game_price_history").select("changed_at").eq("appid", g.appid).order("changed_at", { ascending: false }).limit(1);
    try {
      const entries = await fetchHistory(itadId, key, last?.[0]?.changed_at ?? FIRST_SINCE);
      const priceRows = toPriceRows(g.appid, entries);
      if (priceRows.length) {
        const { error: upErr } = await db.from("game_price_history").upsert(priceRows, { onConflict: "appid,changed_at" });
        if (upErr) throw new Error(`DB_PRICE:${upErr.code}`);
      }
      await db.from("games").update({ itad_id: itadId, price_history_synced_at: now }).eq("appid", g.appid);
      synced++;
      points += priceRows.length;
    } catch (e) {
      failed++;
      if (e instanceof HttpError && (e.status === 401 || e.status === 403)) throw new Error("ITAD_AUTH");
      if (e instanceof HttpError && e.status === 429) break; // 한도 초과: 다음 실행에서 이어서
    }
  }
  return { candidates: rows.length, synced, points, failed };
}
