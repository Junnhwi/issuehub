import { describe, expect, it } from "vitest";
import { fixedTokens, hasEnoughContent, hedgeDropped, numberTokens, unsupportedNumbers, validateArticleItem, type ArticleItemOutput } from "@/lib/ai/schema";

/**
 * 번역·요약 자동 대조 평가 세트(30건). 실제 모델 호출 없이, 모델이 낼 법한 출력을 넣어
 * "원문 대조 규칙이 잘못된 출력을 막고 올바른 출력은 통과시키는지"를 확인한다.
 * 한국어 자연스러움·핵심 누락은 자동으로 판정할 수 없어 사람 검토 대상(docs/quality-report-2026-11-22.md).
 */
const EXCERPT = "The update ships 3 new APIs and cuts cold-start latency by 40% compared with the previous release, according to the maintainers.";
const base: Omit<ArticleItemOutput, "titleKo" | "summaryKo"> = {
  id: "a1",
  excerptKo: "번역",
  summarizable: true,
  keyPoints: [],
  whyItMatters: "배포 지연 시간을 줄일 수 있는 변화입니다.",
  useCases: ["서버리스 함수의 첫 응답 시간을 줄이는 데 활용해 볼 수 있습니다."],
  caveats: "발췌만 근거로 했습니다.",
  topics: [],
  confidenceNotes: "",
};

type Case = { name: string; title: string; excerpt: string | null; titleKo: string; summaryKo: string; expect: "ok" | "translated-only" | string };

const CASES: Case[] = [
  // 정상 통과
  { name: "숫자 보존", title: "Bun 2.1 cuts cold starts", excerpt: EXCERPT, titleKo: "Bun 2.1, 콜드 스타트 단축", summaryKo: "새 API 3개가 추가됐다고 메인테이너들이 밝혔습니다. 콜드 스타트 지연이 40% 줄었다고 합니다.", expect: "ok" },
  { name: "목록 세기 숫자는 허용", title: "Bun 2.1 cuts cold starts", excerpt: EXCERPT, titleKo: "Bun 2.1, 콜드 스타트 단축", summaryKo: "변경점은 2가지입니다. 새 API와 지연 시간 40% 감소입니다.", expect: "ok" },
  { name: "버전 유지", title: "Next.js 16.2: AI Improvements", excerpt: EXCERPT, titleKo: "Next.js 16.2: AI 개선 사항", summaryKo: "새 API 3개가 추가됐습니다. 지연이 40% 줄었다고 합니다.", expect: "ok" },
  { name: "연도 유지", title: "Windows Server 2028 trades compatibility for security", excerpt: null, titleKo: "Windows Server 2028, 호환성 대신 보안 택해", summaryKo: "", expect: "translated-only" },
  { name: "CVE 유지", title: "Patch for CVE-2026-1234 in nginx", excerpt: null, titleKo: "nginx의 CVE-2026-1234 패치", summaryKo: "", expect: "translated-only" },
  { name: "reportedly 유지(제목)", title: "Apple reportedly building an AI agent", excerpt: null, titleKo: "애플, AI 에이전트 개발 중인 것으로 알려져", summaryKo: "", expect: "translated-only" },
  { name: "may 유지(제목)", title: "AI may have solved a math problem", excerpt: null, titleKo: "AI가 수학 난제를 풀었을 수도 있다", summaryKo: "", expect: "translated-only" },
  { name: "claims 유지(제목)", title: "Startup claims 10x faster inference", excerpt: null, titleKo: "스타트업, 추론 속도 10배 향상 주장", summaryKo: "", expect: "translated-only" },
  { name: "질문형 유지", title: "Is Rust worth it for web backends?", excerpt: null, titleKo: "웹 백엔드에 Rust는 쓸 만한가?", summaryKo: "", expect: "translated-only" },
  { name: "allegedly 유지", title: "Firm allegedly leaked user data", excerpt: null, titleKo: "회사가 사용자 데이터를 유출했다는 의혹", summaryKo: "", expect: "translated-only" },
  { name: "according to → 요약에 출처 표현", title: "Bun 2.1 cuts cold starts", excerpt: EXCERPT, titleKo: "Bun 2.1, 콜드 스타트 단축", summaryKo: "메인테이너들에 따르면 새 API 3개가 추가됐습니다. 지연이 40% 줄었습니다.", expect: "ok" },
  { name: "천 단위 쉼표", title: "We closed 1,500 GitHub issues in one month", excerpt: "Our team triaged and closed 1,500 GitHub issues in a single month by automating labeling, deduplication and stale-issue handling across repositories.", titleKo: "한 달 만에 GitHub 이슈 1,500개를 닫았습니다", summaryKo: "팀은 한 달 동안 이슈 1500개를 정리했습니다. 라벨 지정과 중복 제거를 자동화했습니다.", expect: "ok" },
  { name: "한국어 원문", title: "토스, 새 디자인 시스템 공개", excerpt: "토스가 새 디자인 시스템을 공개했다. 컴포넌트 120여 개와 접근성 가이드를 함께 제공하며, 웹과 앱에서 같은 토큰을 쓸 수 있도록 구성했다고 밝혔다.", titleKo: "토스, 새 디자인 시스템 공개", summaryKo: "토스가 새 디자인 시스템을 공개했습니다. 컴포넌트 120여 개와 접근성 가이드를 제공합니다.", expect: "ok" },

  // 막아야 하는 출력
  { name: "없는 숫자 추가", title: "Bun 2.1 cuts cold starts", excerpt: EXCERPT, titleKo: "Bun 2.1, 콜드 스타트 단축", summaryKo: "새 API 3개가 추가됐습니다. 지연이 60% 줄었습니다.", expect: "UNSUPPORTED_NUMBER" },
  { name: "없는 연도 추가", title: "Bun 2.1 cuts cold starts", excerpt: EXCERPT, titleKo: "Bun 2.1, 콜드 스타트 단축", summaryKo: "2027년 출시될 예정입니다. 지연이 40% 줄었습니다.", expect: "UNSUPPORTED_NUMBER" },
  { name: "버전 바뀜", title: "Next.js 16.2: AI Improvements", excerpt: EXCERPT, titleKo: "Next.js 16.3: AI 개선 사항", summaryKo: "새 API 3개가 추가됐습니다. 지연이 40% 줄었습니다.", expect: "TITLE_TOKEN_CHANGED" },
  { name: "연도 빠짐", title: "Windows Server 2028 trades compatibility for security", excerpt: null, titleKo: "Windows Server, 호환성 대신 보안 택해", summaryKo: "", expect: "TITLE_TOKEN_CHANGED" },
  { name: "CVE 바뀜", title: "Patch for CVE-2026-1234 in nginx", excerpt: null, titleKo: "nginx의 CVE-2026-1243 패치", summaryKo: "", expect: "TITLE_TOKEN_CHANGED" },
  { name: "reportedly 사라짐", title: "Apple reportedly building an AI agent", excerpt: null, titleKo: "애플, AI 에이전트 개발", summaryKo: "", expect: "TITLE_HEDGE_DROPPED" },
  { name: "may 사라짐", title: "AI may have solved a math problem", excerpt: null, titleKo: "AI가 수학 난제를 풀었다", summaryKo: "", expect: "TITLE_HEDGE_DROPPED" },
  { name: "claims 사라짐", title: "Startup claims 10x faster inference", excerpt: null, titleKo: "스타트업, 추론 속도 10배 향상", summaryKo: "", expect: "TITLE_HEDGE_DROPPED" },
  { name: "질문을 단정으로", title: "Is Rust worth it for web backends?", excerpt: null, titleKo: "웹 백엔드에는 Rust가 정답", summaryKo: "", expect: "TITLE_HEDGE_DROPPED" },
  {
    name: "요약에서 보도 표현 사라짐",
    title: "FBI database hacked",
    excerpt: "The FBI is reportedly investigating an apparent breach of its criminal information database, CNN reports, citing people familiar with the matter and internal emails.",
    titleKo: "FBI 데이터베이스 해킹",
    summaryKo: "FBI 범죄 정보 데이터베이스가 해킹당했습니다. FBI가 조사 중입니다.",
    expect: "HEDGE_DROPPED",
  },
  {
    name: "요약에 보도 표현 유지",
    title: "FBI database hacked",
    excerpt: "The FBI is reportedly investigating an apparent breach of its criminal information database, CNN reports, citing people familiar with the matter and internal emails.",
    titleKo: "FBI 데이터베이스 해킹",
    summaryKo: "CNN 보도에 따르면 FBI가 범죄 정보 데이터베이스 침해를 조사 중입니다. 내부 이메일을 근거로 한 보도입니다.",
    expect: "ok",
  },

  // 근거 부족 → 번역만
  { name: "GitHub 기본 설명", title: "acme/tool", excerpt: "Contribute to acme/tool development by creating an account on GitHub. Lorem ipsum dolor sit amet consectetur.", titleKo: "acme/tool", summaryKo: "x. y.", expect: "translated-only" },
  { name: "쿠키 안내", title: "Some post", excerpt: "We use cookies to improve your experience on our site. By continuing to browse you agree to our use of cookies and policy.", titleKo: "어떤 글", summaryKo: "x. y.", expect: "translated-only" },
  { name: "제목 되풀이", title: "Rust compiler performance improvements in the latest nightly build", excerpt: "Rust compiler performance improvements in the latest nightly build. Rust compiler performance improvements.", titleKo: "최신 nightly 빌드의 Rust 컴파일러 성능 개선", summaryKo: "x. y.", expect: "translated-only" },
  { name: "짧은 발췌", title: "Show HN: A tiny tool", excerpt: "A tiny tool for developers.", titleKo: "Show HN: 작은 도구", summaryKo: "x. y.", expect: "translated-only" },
  { name: "의미 없는 반복 문자", title: "Post", excerpt: "x".repeat(200), titleKo: "글", summaryKo: "x. y.", expect: "translated-only" },
  { name: "발췌 없음", title: "PostgreSQL 19 Released", excerpt: null, titleKo: "PostgreSQL 19 출시", summaryKo: "", expect: "translated-only" },
];

describe("AI 출력 원문 대조(30건)", () => {
  it("평가 세트는 30건 이상", () => expect(CASES.length).toBeGreaterThanOrEqual(30));
  it.each(CASES)("$name → $expect", (c) => {
    const out = { ...base, titleKo: c.titleKo, summaryKo: c.summaryKo };
    const run = () => validateArticleItem(out, { title: c.title, excerpt: c.excerpt, publishedAt: null });
    if (c.expect.startsWith("TITLE_")) return expect(run).toThrow(c.expect);
    const r = run();
    if (c.expect === "ok") return expect(r.summaryNote).toBeNull();
    if (c.expect === "translated-only") return expect(r).toMatchObject({ summary: null, summaryNote: "INSUFFICIENT_CONTENT" });
    expect(r).toMatchObject({ summary: null, summaryNote: c.expect });
  });
});

describe("대조 도우미", () => {
  it("numberTokens", () => {
    expect(numberTokens("v2.1.3, 1,500건, 40%와 3가지 변화")).toEqual(["2.1.3", "1500", "40"]);
  });
  it("unsupportedNumbers는 근거에 없는 숫자만", () => {
    expect(unsupportedNumbers("40%와 60%", "cut by 40%")).toEqual(["60"]);
  });
  it("fixedTokens", () => {
    expect(fixedTokens("Next.js 16.2 and CVE-2026-1234 in 2028")).toEqual(["16.2", "CVE-2026-1234", "2028"]);
  });
  it("hedgeDropped", () => {
    expect(hedgeDropped("X reportedly does Y", "X가 Y를 한 것으로 알려져")).toBe(false);
    expect(hedgeDropped("X does Y", "X가 Y를 함")).toBe(false);
  });
  it("hasEnoughContent는 한국어 발췌를 글자 수로 판단", () => {
    expect(hasEnoughContent("가".repeat(30) + " 나".repeat(30))).toBe(true);
  });
});
