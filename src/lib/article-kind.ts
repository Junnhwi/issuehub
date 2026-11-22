import { hostOf } from "@/lib/utils";

/**
 * 기사 성격(제목·URL 규칙 기반, 내부 분류). 화면에는 기본값(news)을 빼고 짧은 글자 레이블로만 보여 준다.
 * 사실 여부 판단이 아니라 "어떤 종류의 글인지" 힌트일 뿐이다.
 */
export type ArticleKind = "security" | "research" | "tool" | "release" | "guide" | "news";

export const ARTICLE_KIND_LABEL: Record<ArticleKind, string> = {
  security: "보안",
  research: "연구",
  tool: "도구·오픈소스",
  release: "발표",
  guide: "튜토리얼·분석",
  news: "뉴스·의견",
};

const RULES: [ArticleKind, RegExp][] = [
  ["security", /\b(cve-\d{4}-\d+|vulnerabilit\w*|exploit\w*|zero-day|0-?day|malware|ransomware|backdoor\w*|data breach|breached|hacked|security (advisory|update|patch|flaw|fix|bug)|supply[- ]chain attack|rce|xss|csrf|sql injection|privilege escalation)\b/i],
  ["research", /\b(paper|preprint|study finds|researchers?|we (find|show|propose)|arxiv)\b/i],
  ["tool", /^(show hn|launch hn)\b|\bopen[- ]sourc(e|ed|ing)\b/i],
  ["release", /\b(introducing|announc(e|es|ed|ing)|launch(es|ed)?|released?|releases|now available|generally available|unveil(s|ed)?|is here|is out|what's new)\b|^[\w.+#-]+ v?\d+(\.\d+)*$/i],
  ["guide", /\b(how (to|we|i)|guide|tutorial|deep dive|explained|walkthrough|under the hood|lessons (learned|from)|primer|in practice)\b/i],
];

export function articleKind(title: string, url: string): ArticleKind {
  const host = hostOf(url);
  if (host === "arxiv.org" || host.endsWith(".arxiv.org")) return "research";
  for (const [kind, re] of RULES) if (re.test(title)) return kind;
  if (host === "github.com" || host === "gitlab.com" || host === "codeberg.org") return "tool";
  return "news";
}
