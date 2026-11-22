import { describe, expect, it } from "vitest";
import { extractArticle, robotsAllows, robotsPermitAi } from "../scripts/lib/extract";
import { cleanReadme } from "../scripts/sources/github";
import { validateDeepRead, validateRepoGuide, type DeepReadOutput, type RepoGuideOutput } from "@/lib/ai/deep-read";

describe("robots.txt", () => {
  const robots = `User-agent: *
Disallow: /private
Allow: /private/public

User-agent: GPTBot
User-agent: ClaudeBot
Disallow: /`;
  it("* 그룹 규칙(가장 긴 규칙 우선)", () => {
    expect(robotsAllows(robots, "/blog/post", "issuehub")).toBe(true);
    expect(robotsAllows(robots, "/private/x", "issuehub")).toBe(false);
    expect(robotsAllows(robots, "/private/public/x", "issuehub")).toBe(true);
  });
  it("지정 에이전트 그룹이 * 보다 우선", () => {
    expect(robotsAllows(robots, "/blog", "GPTBot")).toBe(false);
    expect(robotsAllows(robots, "/blog", "claudebot")).toBe(false);
  });
  it("대표 AI 수집기를 막은 사이트는 읽지 않는다", () => {
    expect(robotsPermitAi(robots, "/blog/post")).toBe(false);
    expect(robotsPermitAi("User-agent: *\nDisallow: /admin", "/blog/post")).toBe(true);
    expect(robotsPermitAi("", "/anything")).toBe(true);
  });
  it("와일드카드와 $", () => {
    expect(robotsAllows("User-agent: *\nDisallow: /*.pdf$", "/a/b.pdf", "x")).toBe(false);
    expect(robotsAllows("User-agent: *\nDisallow: /*.pdf$", "/a/b.pdf?x=1", "x")).toBe(true);
  });
});

describe("본문 추출", () => {
  const html = `<html><head>
<meta property="og:image" content="/img/cover.png">
<meta name="robots" content="index, follow">
</head><body><nav>메뉴 홈 소개</nav><header>사이트 이름</header>
<article><h1>Big Release</h1><p>First &amp; important paragraph.</p><ul><li>one</li><li>two</li></ul>
<pre><code>npm install x</code></pre><script>alert(1)</script></article>
<footer>copyright</footer></body></html>`;
  it("article 영역의 제목·문단·목록·코드만 남기고 메뉴·스크립트는 뺀다", () => {
    const r = extractArticle(html, "https://example.com/post");
    expect(r.text).toContain("## Big Release");
    expect(r.text).toContain("First & important paragraph.");
    expect(r.text).toContain("- one");
    expect(r.text).toContain("npm install x");
    expect(r.text).not.toMatch(/메뉴|copyright|alert/);
    expect(r.imageUrl).toBe("https://example.com/img/cover.png");
    expect(r.noAi).toBe(false);
  });
  it("noai 메타와 http 이미지", () => {
    const r = extractArticle(`<meta name="robots" content="noai, noimageai"><meta property="og:image" content="http://x.com/a.png"><body>t</body>`, "https://x.com");
    expect(r.noAi).toBe(true);
    expect(r.imageUrl).toBeNull();
  });
});

describe("README 정리", () => {
  it("이미지·배지·주석 제거", () => {
    const md = `[![CI](https://x/badge.svg)](https://x)\n<!-- hidden -->\n# Tool\n![logo](a.png)\n<img src="x.png">\nDoes things.`;
    expect(cleanReadme(md)).toBe("# Tool\n\n Does things.".replace("\n\n ", "\n\n\n").replace(/\n{3,}/g, "\n\n"));
  });
});

const SOURCE = "NGINX has two critical bugs tracked as CVE-2026-1 and CVE-2026-2 with a CVSS score of 9.2. Disable HTTP/2 with http2 off; until you upgrade to 1.29.1.";
const deep = (over: Partial<DeepReadOutput> = {}): DeepReadOutput => ({
  readable: true,
  level: "중급",
  overview: "NGINX의 HTTP/2 처리에서 치명적인 취약점 두 개가 발견되었습니다. CVSS 9.2로 평가되었습니다.",
  prerequisites: ["HTTP/2"],
  keyConcepts: [{ term: "Use-After-Free", explanation: "해제된 메모리를 다시 쓰는 버그로, 1990년대부터 알려진 유형입니다." }],
  sections: [{ heading: "대응", body: "업그레이드 전까지 http2 off; 로 HTTP/2를 끕니다. 1.29.1로 올리면 해결됩니다." }],
  practical: ["http2 off; 설정"],
  quotes: [
    { original: "Disable HTTP/2 with http2 off; until you upgrade to 1.29.1.", ko: "업그레이드 전까지 HTTP/2를 끄세요." },
    { original: "This sentence is not in the source at all, made up.", ko: "지어낸 문장" },
  ],
  limitations: "",
  ...over,
});

describe("원문 해설 검증", () => {
  it("원문에 있는 인용만 남긴다", () => {
    const v = validateDeepRead(deep(), SOURCE);
    expect(v.quotes).toHaveLength(1);
    expect(v.quotes[0].original).toContain("http2 off");
  });
  it("용어 풀이의 숫자(일반 설명)는 대조하지 않는다", () => {
    expect(() => validateDeepRead(deep(), SOURCE)).not.toThrow();
  });
  it("개요·본문에 원문에 없는 숫자가 있으면 거부", () => {
    expect(() => validateDeepRead(deep({ overview: "취약점 세 개입니다. CVSS 9.8로 평가되었습니다." }), SOURCE)).toThrow("UNSUPPORTED_NUMBER");
  });
  it("읽을 수 없는 문서·빈 섹션은 거부", () => {
    expect(() => validateDeepRead(deep({ readable: false }), SOURCE)).toThrow("NOT_READABLE");
    expect(() => validateDeepRead(deep({ sections: [] }), SOURCE)).toThrow("NO_SECTIONS");
  });
});

describe("README 가이드 검증", () => {
  const README = "# fastq\nA queue for Node.js. Install with `npm install fastq`. Handles 10000 jobs per second.";
  const guide = (over: Partial<RepoGuideOutput> = {}): RepoGuideOutput => ({
    summarizable: true,
    whatItIs: "Node.js용 작업 큐입니다.",
    problem: "작업을 순서대로 빠르게 처리하려는 문제를 풉니다.",
    audience: "Node.js 개발자",
    features: ["초당 10000개 작업 처리"],
    useCases: ["백그라운드 작업 처리"],
    gettingStarted: [
      { step: "설치", command: "npm install fastq" },
      { step: "실행", command: "fastq --start" },
    ],
    stack: ["Node.js"],
    limitations: "",
    ...over,
  });
  it("README에 없는 명령어는 지운다", () => {
    const g = validateRepoGuide(guide(), README)!;
    expect(g.gettingStarted).toEqual([
      { step: "설치", command: "npm install fastq" },
      { step: "실행", command: "" },
    ]);
  });
  it("README에 없는 숫자는 거부, 근거 부족은 null", () => {
    expect(() => validateRepoGuide(guide({ features: ["초당 50000개"] }), README)).toThrow("UNSUPPORTED_NUMBER");
    expect(validateRepoGuide(guide({ summarizable: false }), README)).toBeNull();
  });
});
