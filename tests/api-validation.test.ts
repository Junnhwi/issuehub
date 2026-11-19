import { describe, expect, it } from "vitest";
import { articleListSchema, parseLenient, repoListSchema, uuidSchema } from "@/lib/validation/params";
import { countSentences, hasEnoughContent, hasEnoughRepoDescription, validateRepoSummary, validateSummary, SummaryValidationError, type SummaryOutput } from "@/lib/ai/schema";

describe("article list params", () => {
  it("applies defaults", () => {
    expect(articleListSchema.parse({})).toMatchObject({ period: "all", sort: "latest", limit: 20 });
  });
  it("rejects unknown sort/period, too-large limit, bad cursor and unknown topic", () => {
    expect(articleListSchema.safeParse({ sort: "hot" }).success).toBe(false);
    expect(articleListSchema.safeParse({ period: "1y" }).success).toBe(false);
    expect(articleListSchema.safeParse({ limit: "51" }).success).toBe(false);
    expect(articleListSchema.safeParse({ limit: "0" }).success).toBe(false);
    expect(articleListSchema.safeParse({ cursor: "abc" }).success).toBe(false);
    expect(articleListSchema.safeParse({ topic: "cooking" }).success).toBe(false);
  });
  it("trims q, drops empty q and caps length", () => {
    expect(articleListSchema.parse({ q: "  mcp " }).q).toBe("mcp");
    expect(articleListSchema.parse({ q: "   " }).q).toBeUndefined();
    expect(articleListSchema.safeParse({ q: "x".repeat(101) }).success).toBe(false);
  });
  it("lenient parsing (pages) drops invalid values instead of failing", () => {
    expect(parseLenient(articleListSchema, { sort: "hot", period: "7d" })).toMatchObject({ sort: "latest", period: "7d" });
  });
});

describe("repo list params / ids", () => {
  it("validates sort", () => {
    expect(repoListSchema.parse({}).sort).toBe("stars");
    expect(repoListSchema.safeParse({ sort: "trending" }).success).toBe(false);
  });
  it("validates uuid", () => {
    expect(uuidSchema.safeParse("00000000-0000-4000-8000-000000000001").success).toBe(true);
    expect(uuidSchema.safeParse("1; drop table").success).toBe(false);
  });
});

describe("AI summary validation", () => {
  const good: SummaryOutput = {
    insufficient: false,
    titleKo: "<b>새 기능</b> 출시",
    summaryKo: "첫 문장입니다. 두 번째 문장입니다.",
    keyPoints: ["a", "b", "c", "d", "e"],
    whyItMatters: "중요합니다.",
    useCases: ["1", "2", "3", "4"],
    caveats: "원문 확인 필요",
    topics: ["ai-llm", "made-up-topic", "ai-llm"],
    confidenceNotes: "발췌 기반",
  };
  it("strips HTML, caps counts and keeps only registered topics", () => {
    const v = validateSummary(good);
    expect(v.titleKo).toBe("새 기능 출시");
    expect(v.keyPoints).toHaveLength(4);
    expect(v.useCases).toHaveLength(3);
    expect(v.topics).toEqual(["ai-llm"]);
  });
  it("requires a 2–4 sentence summary", () => {
    expect(() => validateSummary({ ...good, summaryKo: "한 문장뿐입니다." })).toThrow(SummaryValidationError);
    expect(() => validateSummary({ ...good, summaryKo: "1. 2. 3. 4. 5." })).toThrow(SummaryValidationError);
    expect(countSentences("하나입니다. 둘입니다! 셋인가요?")).toBe(3);
  });
  it("validates repo summaries as 1–2 sentences and strips HTML", () => {
    expect(validateRepoSummary({ insufficient: false, summaryKo: "<b>에이전트</b> 도구 모음입니다." })).toBe("에이전트 도구 모음입니다.");
    expect(() => validateRepoSummary({ insufficient: false, summaryKo: "" })).toThrow(SummaryValidationError);
    expect(() => validateRepoSummary({ insufficient: false, summaryKo: "하나. 둘. 셋." })).toThrow(SummaryValidationError);
    expect(hasEnoughRepoDescription("CLI")).toBe(false);
    expect(hasEnoughRepoDescription("Reverse engineer anything with agents, down to binaries.")).toBe(true);
  });
  it("skips AI when there is not enough source text", () => {
    expect(hasEnoughContent(null)).toBe(false);
    expect(hasEnoughContent("short")).toBe(false);
    expect(hasEnoughContent("x".repeat(80))).toBe(true);
  });
});
