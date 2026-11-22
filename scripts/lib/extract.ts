import { stripHtml } from "../../src/lib/ingestion/normalize";
import { safeFetchText } from "./safe-fetch";

/**
 * AI 원문 해설용 본문 읽기. 원칙:
 * - robots.txt에서 우리 수집기(*)나 대표 AI 수집기(GPTBot·ClaudeBot·Google-Extended 등)를 막은 사이트는 읽지 않는다
 *   (AI 이용을 원하지 않는다는 신호로 본다). <meta name="robots" content="noai">도 같다
 * - 본문은 AI 입력으로만 쓰고 저장하지 않는다(해설 결과와 짧은 근거 인용만 저장)
 * - 요청은 safe-fetch(SSRF 방어, 크기·시간 제한)로만
 */

const AI_AGENTS = ["gptbot", "chatgpt-user", "claudebot", "claude-web", "anthropic-ai", "google-extended", "ccbot", "perplexitybot", "bytespider", "cohere-ai"];
export const OUR_AGENT = "issuehub";

/** robots.txt 파싱 → 경로 허용 여부. 지정 에이전트 그룹이 있으면 그것을, 없으면 * 그룹을 따른다(가장 긴 규칙 우선) */
export function robotsAllows(robots: string, path: string, agent: string): boolean {
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value) current.rules.push({ allow: key === "allow", path: value });
      lastWasAgent = false;
    } else lastWasAgent = false;
  }
  const a = agent.toLowerCase();
  const group = groups.find((g) => g.agents.some((x) => x !== "*" && a.includes(x))) ?? groups.find((g) => g.agents.includes("*"));
  if (!group) return true;
  const toRe = (p: string) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\\\$$/, "$"));
  const hit = group.rules.filter((r) => toRe(r.path).test(path)).sort((x, y) => y.path.length - x.path.length || Number(y.allow) - Number(x.allow))[0];
  return hit ? hit.allow : true;
}

/** 우리 수집기와 대표 AI 수집기가 모두 허용될 때만 true */
export function robotsPermitAi(robots: string, path: string): boolean {
  return [OUR_AGENT, ...AI_AGENTS].every((agent) => robotsAllows(robots, path, agent));
}

export interface ExtractedPage {
  text: string;
  imageUrl: string | null;
  /** <meta name="robots" content="noai"> 등 AI 이용 거부 표시 */
  noAi: boolean;
}

const pick = (html: string, tag: string) => {
  const all = [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "gi"))].map((m) => m[1]);
  return all.sort((a, b) => b.length - a.length)[0] ?? null;
};

/** HTML에서 본문 텍스트(제목·문단·목록·코드 구조 유지), 대표 이미지(og:image), AI 거부 표시를 뽑는다 */
export function extractArticle(html: string, pageUrl: string, maxChars = 16_000): ExtractedPage {
  const robotsMeta = html.match(/<meta[^>]+name=["'](?:robots|googlebot)["'][^>]*content=["']([^"']+)["']/i)?.[1] ?? "";
  const noAi = /\bno-?ai\b|\bnoimageai\b/i.test(robotsMeta);
  const og =
    html.match(/<meta[^>]+property=["']og:image(?::url)?["'][^>]*content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image(?::url)?["']/i)?.[1];
  let imageUrl: string | null = null;
  try {
    const u = og ? new URL(og.replace(/&amp;/g, "&"), pageUrl) : null;
    imageUrl = u && u.protocol === "https:" ? u.toString() : null;
  } catch {
    imageUrl = null;
  }

  const region = pick(html, "article") ?? pick(html, "main") ?? pick(html, "body") ?? html;
  const marked = region
    .replace(/<(script|style|noscript|svg|nav|header|footer|aside|form|button|iframe|template)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<h([1-4])\b[^>]*>/gi, (_, n) => `\n${"#".repeat(Number(n) + 1)} `)
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<pre\b[^>]*>/gi, "\n```\n")
    .replace(/<\/pre>/gi, "\n```\n")
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/blockquote|\/section)\b[^>]*>/gi, "\n");
  const lines = marked
    .split("\n")
    .map((l) => (l.trim() === "```" ? "```" : (stripHtml(l, 4000) ?? "")))
    .filter((l, i, arr) => l && !(l === "```" && arr[i - 1] === "```"));
  const text = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  return { text: text.length > maxChars ? `${text.slice(0, maxChars)}\n…(이하 생략)` : text, imageUrl, noAi };
}

export type ReadResult = { ok: true; page: ExtractedPage; chars: number } | { ok: false; reason: "ROBOTS_DISALLOW" | "NOAI_META" | "FETCH_FAILED" | "TOO_SHORT" | "BAD_URL" };

/** robots 확인 → 페이지 읽기 → 본문 추출. 본문이 너무 짧으면(로그인 벽·스크립트 렌더 사이트) TOO_SHORT */
export async function readArticle(url: string): Promise<ReadResult> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return { ok: false, reason: "BAD_URL" };
  }
  const robots = await safeFetchText(`${u.origin}/robots.txt`, { accept: ["text/plain"], maxBytes: 200_000, timeoutMs: 5000 });
  if (robots && !robotsPermitAi(robots, u.pathname + u.search)) return { ok: false, reason: "ROBOTS_DISALLOW" };
  const html = await safeFetchText(url, { accept: ["text/html", "application/xhtml+xml"], maxBytes: 1_500_000, timeoutMs: 12_000 });
  if (!html) return { ok: false, reason: "FETCH_FAILED" };
  const page = extractArticle(html, url);
  if (page.noAi) return { ok: false, reason: "NOAI_META" };
  const chars = page.text.replace(/\s/g, "").length;
  if (chars < 600) return { ok: false, reason: "TOO_SHORT" };
  return { ok: true, page, chars };
}
