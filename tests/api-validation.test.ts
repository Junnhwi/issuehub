import { describe, expect, it } from "vitest";
import { articleListSchema, parseLenient, repoListSchema, uuidSchema } from "@/lib/validation/params";
import { countSentences, hasEnoughContent, hasEnoughRepoDescription, validateArticleItem, validateRepoSummary, validateSummary, SummaryValidationError, type ArticleItemOutput, type SummaryFields } from "@/lib/ai/schema";
import { DEFAULT_MODELS, resolveProvider } from "@/lib/ai/provider";

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
  const fields: SummaryFields = {
    summaryKo: "첫 문장입니다. 두 번째 문장입니다.",
    keyPoints: ["a", "b", "c", "d", "e"],
    whyItMatters: "중요합니다.",
    useCases: ["1", "2", "3", "4"],
    caveats: "원문 확인 필요",
    topics: ["ai-llm", "made-up-topic", "ai-llm"],
    confidenceNotes: "발췌 기반",
  };
  const item: ArticleItemOutput = { id: "a1", titleKo: "<b>새 기능</b> 출시", excerptKo: "발췌 번역입니다.", summarizable: true, ...fields };
  const longExcerpt = "x".repeat(120);

  it("caps counts and keeps only registered topics", () => {
    const v = validateSummary(fields);
    expect(v.keyPoints).toHaveLength(4);
    expect(v.useCases).toHaveLength(3);
    expect(v.topics).toEqual(["ai-llm"]);
  });
  it("requires a 2–4 sentence summary", () => {
    expect(() => validateSummary({ ...fields, summaryKo: "한 문장뿐입니다." })).toThrow(SummaryValidationError);
    expect(() => validateSummary({ ...fields, summaryKo: "1. 2. 3. 4. 5." })).toThrow(SummaryValidationError);
    expect(countSentences("하나입니다. 둘입니다! 셋인가요?")).toBe(3);
  });
  it("translates title and excerpt, and summarizes only with enough source text", () => {
    const full = validateArticleItem(item, { excerpt: longExcerpt });
    expect(full).toMatchObject({ titleKo: "새 기능 출시", excerptKo: "발췌 번역입니다.", summaryNote: null });
    expect(full.summary?.summaryKo).toBe(fields.summaryKo);

    const short = validateArticleItem(item, { excerpt: "short" });
    expect(short).toMatchObject({ titleKo: "새 기능 출시", excerptKo: "발췌 번역입니다.", summary: null, summaryNote: "INSUFFICIENT_CONTENT" });

    expect(validateArticleItem(item, { excerpt: null }).excerptKo).toBeNull();
    expect(validateArticleItem({ ...item, summarizable: false }, { excerpt: longExcerpt })).toMatchObject({ summary: null, summaryNote: "MODEL_INSUFFICIENT" });
  });
  it("keeps the translation when only the summary fails validation", () => {
    const v = validateArticleItem({ ...item, summaryKo: "한 문장." }, { excerpt: longExcerpt });
    expect(v).toMatchObject({ titleKo: "새 기능 출시", summary: null, summaryNote: "SUMMARY_SENTENCES_1" });
  });
  it("rejects an item without a Korean title", () => {
    expect(() => validateArticleItem({ ...item, titleKo: "  " }, { excerpt: longExcerpt })).toThrow(SummaryValidationError);
  });
  it("validates repo summaries as 1–2 sentences and strips HTML", () => {
    expect(validateRepoSummary({ summaryKo: "<b>에이전트</b> 도구 모음입니다." })).toBe("에이전트 도구 모음입니다.");
    expect(() => validateRepoSummary({ summaryKo: "" })).toThrow(SummaryValidationError);
    expect(() => validateRepoSummary({ summaryKo: "하나. 둘. 셋." })).toThrow(SummaryValidationError);
    expect(hasEnoughRepoDescription("CLI")).toBe(false);
    expect(hasEnoughRepoDescription("Reverse engineer anything with agents, down to binaries.")).toBe(true);
  });
  it("skips AI summary when there is not enough source text", () => {
    expect(hasEnoughContent(null)).toBe(false);
    expect(hasEnoughContent("short")).toBe(false);
    expect(hasEnoughContent("x".repeat(80))).toBe(true);
  });
});

describe("AI provider selection", () => {
  it("is off unless explicitly enabled", () => {
    expect(resolveProvider({ GEMINI_API_KEY: "k" })).toBeNull();
  });
  it("prefers the free Gemini tier when both keys exist", () => {
    expect(resolveProvider({ AI_SUMMARIZATION_ENABLED: "true", GEMINI_API_KEY: "g", ANTHROPIC_API_KEY: "a" })).toMatchObject({ name: "gemini", model: DEFAULT_MODELS.gemini, intervalMs: 4500 });
  });
  it("honours AI_PROVIDER and model overrides, and needs the matching key", () => {
    expect(resolveProvider({ AI_SUMMARIZATION_ENABLED: "true", AI_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "a", ANTHROPIC_MODEL: "m" })).toMatchObject({ name: "anthropic", model: "m", intervalMs: 0 });
    expect(resolveProvider({ AI_SUMMARIZATION_ENABLED: "true", AI_PROVIDER: "anthropic", GEMINI_API_KEY: "g" })).toBeNull();
    expect(resolveProvider({ AI_SUMMARIZATION_ENABLED: "true", ANTHROPIC_API_KEY: "a" })?.name).toBe("anthropic");
  });
});
