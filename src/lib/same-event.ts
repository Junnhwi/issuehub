import { hostOf } from "@/lib/utils";

/**
 * 같은 사건을 다룬 서로 다른 출처의 기사 묶기(가벼운 규칙, AI 없음). 기사를 지우지 않고 화면에서만 묶는다.
 * 같은 사건으로 보는 조건(모두 만족):
 * 1. 원문 도메인이 다르다(같은 블로그의 연재 글은 묶지 않음)
 * 2. 발행 시각 차이 72시간 이내
 * 3. 제목의 숫자·버전·CVE 토큰이 정확히 같다("Next.js 16.2"와 "16.3", 서로 다른 CVE는 따로)
 * 4. 제목 단어(불용어 제외, 간단한 어미 정리) Jaccard ≥ 0.5, 공유 토큰 2개 이상
 * 주제가 비슷할 뿐인 글은 4번에서 대부분 걸러진다. 놓치는 경우가 있어도 잘못 묶지 않는 쪽을 택했다.
 */
const STOP = new Set(
  "the a an of to in for and on with is are was were be been from by your you how why what when new we our at as it its this that into over about after than more most has have had will can not just now via vs show ask hn".split(" "),
);
const stem = (w: string) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, "") : w.length > 4 ? w.replace(/s$/, "") : w);

export function titleSignature(title: string) {
  const raw = title.toLowerCase().replace(/[’']s\b/g, "").match(/[\p{L}\p{N}][\p{L}\p{N}.+#-]*/gu) ?? [];
  const tokens = raw.map((t) => t.replace(/[.]+$/, ""));
  const nums = new Set(tokens.filter((t) => /\d/.test(t)));
  const words = new Set(tokens.filter((t) => !/\d/.test(t) && t.length > 2 && !STOP.has(t)).map(stem));
  return { nums, words };
}

const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));
const HOURS_72 = 72 * 3600_000;

export function isSameEvent(a: { title: string; url: string; time: string | null }, b: { title: string; url: string; time: string | null }) {
  if (hostOf(a.url) === hostOf(b.url)) return false;
  if (a.time && b.time && Math.abs(Date.parse(a.time) - Date.parse(b.time)) > HOURS_72) return false;
  const sa = titleSignature(a.title);
  const sb = titleSignature(b.title);
  if (!sameSet(sa.nums, sb.nums)) return false;
  const shared = [...sa.words].filter((w) => sb.words.has(w)).length;
  const union = sa.words.size + sb.words.size - shared;
  return shared + sa.nums.size >= 2 && union > 0 && shared / union >= 0.5;
}

/** 목록 순서를 유지하며 앞에 나온 글을 대표로, 같은 사건인 뒤 글들을 related로 붙인다 */
export function groupSameEvent<T extends { title: string; originalUrl: string; publishedAt: string | null; fetchedAt: string }>(items: T[]): { item: T; related: T[] }[] {
  const groups: { item: T; related: T[] }[] = [];
  const key = (x: T) => ({ title: x.title, url: x.originalUrl, time: x.publishedAt ?? x.fetchedAt });
  for (const it of items) {
    const g = groups.find((g) => [g.item, ...g.related].some((m) => isSameEvent(key(m), key(it))));
    if (g) g.related.push(it);
    else groups.push({ item: it, related: [] });
  }
  return groups;
}
