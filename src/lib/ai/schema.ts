import { z } from "zod";
import { TOPIC_SLUGS } from "@/config/topics";
import { stripHtml } from "@/lib/ingestion/normalize";

/*
 * AI 출력 스키마(구조화 출력)와 검증. 길이·개수·문장 수 같은 세부 규칙은 모델에 맡기지 않고 여기서 검증한다.
 * 기사 여러 개를 한 번에 처리(배치)해 무료 한도를 아낀다. id는 프롬프트에서 붙인 짧은 키(a1, a2...).
 */

const summaryFields = {
  summaryKo: z.string(),
  keyPoints: z.array(z.string()),
  whyItMatters: z.string(),
  useCases: z.array(z.string()),
  caveats: z.string(),
  topics: z.array(z.string()),
  confidenceNotes: z.string(),
};

export const ArticleItemSchema = z.object({
  id: z.string(),
  titleKo: z.string().describe("자연스러운 한국어 제목(이미 한국어면 그대로)"),
  excerptKo: z.string().describe("발췌의 충실한 한국어 번역. 발췌가 없으면 빈 문자열"),
  summarizable: z.boolean().describe("제공된 정보만으로 요약할 근거가 충분하면 true"),
  ...summaryFields,
});
export const ArticleBatchSchema = z.object({ items: z.array(ArticleItemSchema) });
export type ArticleItemOutput = z.infer<typeof ArticleItemSchema>;

export const RepoItemSchema = z.object({
  id: z.string(),
  summarizable: z.boolean().describe("설명만으로 무엇을 하는 저장소인지 알 수 있으면 true"),
  summaryKo: z.string(),
});
export const RepoBatchSchema = z.object({ items: z.array(RepoItemSchema) });

export const GameItemSchema = z.object({ id: z.string(), descriptionKo: z.string() });
export const GameBatchSchema = z.object({ items: z.array(GameItemSchema) });

export type SummaryFields = Pick<ArticleItemOutput, keyof typeof summaryFields>;

export interface ValidSummary {
  summaryKo: string;
  keyPoints: string[];
  whyItMatters: string;
  useCases: string[];
  caveats: string;
  topics: string[];
  confidenceNotes: string;
}

export class SummaryValidationError extends Error {}

const clean = (s: string, max: number) => stripHtml(s, max) ?? "";

/** 한국어·영어 문장 수(마침표/물음표/느낌표 기준) */
export function countSentences(text: string) {
  return text.split(/(?<=[.!?。])\s+/).filter((s) => s.trim().length > 1).length;
}

/** 숫자 토큰(천 단위 쉼표 제거). "2가지"·"3개"처럼 목록을 세는 한 자리 수는 뺀다 */
export function numberTokens(text: string): string[] {
  const t = text.replace(/(\d),(?=\d{3}\b)/g, "$1").replace(/(^|[^\d.])\d\s?(가지|개의?|단계|문장|곳|건)/g, "$1");
  return t.match(/\d+(?:\.\d+)*/g) ?? [];
}

/** 요약에 나온 숫자 중 근거(제목·발췌·게시일)에 없는 것 */
const WORD_NUMBERS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12",
  january: "1", february: "2", march: "3", april: "4", may: "5", june: "6", july: "7", august: "8", september: "9", october: "10", november: "11", december: "12",
  jan: "1", feb: "2", mar: "3", apr: "4", jun: "6", jul: "7", aug: "8", sep: "9", sept: "9", oct: "10", nov: "11", dec: "12",
  dozen: "12", hundred: "100", thousand: "1000",
};
export function unsupportedNumbers(generated: string, source: string): string[] {
  // 영어 숫자 단어·월 이름("seven", "September")을 한국어에서 숫자("7", "9월")로 옮기는 것은 허용
  const words = (source.toLowerCase().match(/[a-z]+/g) ?? []).flatMap((w) => (WORD_NUMBERS[w] ? [WORD_NUMBERS[w]] : []));
  const have = new Set([...numberTokens(source), ...words]);
  return [...new Set(numberTokens(generated))].filter((n) => !have.has(n));
}

/** 원문의 불확실성 표현. 강한 것(보도·주장)은 요약에서도, 약한 것(may·could)까지는 제목 번역에서 유지해야 한다 */
const STRONG_HEDGE_EN = /\b(reportedly|allegedly|alleged|claims?|claimed|rumou?r(s|ed)?|purported(ly)?|unconfirmed|sources say|reports? say)\b/i;
const ANY_HEDGE_EN = /\b(reportedly|allegedly|alleged|claims?|claimed|rumou?r(s|ed)?|purported(ly)?|unconfirmed|may|might|could|possibly|likely|appears? to|seems? to)\b|\?\s*$/i;
const HEDGE_KO = /(알려|보도|주장|의혹|전해|가능성|수도|수 있|지도 모|모릅|일지|할지|듯|추정|것으로|따르면|소문|루머|예상|\?)/;

export const hasStrongHedge = (text: string) => STRONG_HEDGE_EN.test(text);
/** 원문 제목의 불확실성이 번역 제목에서 사라졌는가 */
export const hedgeDropped = (source: string, translated: string, strong = false) => (strong ? STRONG_HEDGE_EN : ANY_HEDGE_EN).test(source) && !HEDGE_KO.test(translated);

/** 버전·연도·CVE처럼 번역해도 바뀌면 안 되는 토큰(제목용) */
export function fixedTokens(title: string): string[] {
  return [...new Set(title.match(/\bCVE-\d{4}-\d+\b|\d+\.\d+(?:\.\d+)*|\b(?:19|20)\d{2}\b/gi) ?? [])];
}

/** 요약 필드 검증: HTML 제거, 2~4문장, 개수·길이 제한, 등록된 토픽만 */
export function validateSummary(out: SummaryFields): ValidSummary {
  const summaryKo = clean(out.summaryKo, 700);
  const sentences = countSentences(summaryKo);
  if (sentences < 2 || sentences > 4) throw new SummaryValidationError(`SUMMARY_SENTENCES_${sentences}`);
  const whyItMatters = clean(out.whyItMatters, 400);
  if (!whyItMatters) throw new SummaryValidationError("EMPTY_WHY");
  return {
    summaryKo,
    keyPoints: out.keyPoints.map((p) => clean(p, 200)).filter(Boolean).slice(0, 4),
    whyItMatters,
    useCases: out.useCases.map((u) => clean(u, 200)).filter(Boolean).slice(0, 3),
    caveats: clean(out.caveats, 400),
    topics: [...new Set(out.topics)].filter((t) => (TOPIC_SLUGS as string[]).includes(t)).slice(0, 4),
    confidenceNotes: clean(out.confidenceNotes, 400),
  };
}

export interface ValidArticleItem {
  titleKo: string;
  excerptKo: string | null;
  /** 요약이 검증을 통과했을 때만 값이 있다 */
  summary: ValidSummary | null;
  /** 요약을 만들지 않은 이유(근거 부족 등) 또는 검증 실패 코드 */
  summaryNote: "INSUFFICIENT_CONTENT" | "MODEL_INSUFFICIENT" | string | null;
}

/**
 * 기사 한 건 결과 검증. 번역(제목·발췌)은 요약과 별개로 저장한다.
 * - 제목 번역이 비었거나, 버전·연도·CVE가 바뀌었거나, 원문의 불확실 표현이 사라지면 항목 전체를 다시 시도(예외)
 * - 요약은 형식 검증 + 원문 대조(숫자, 보도·주장 표현)를 통과해야 저장한다. 사실 검증(팩트체크)은 아니다
 */
export function validateArticleItem(out: ArticleItemOutput, input: { title: string; excerpt: string | null; publishedAt?: string | null }): ValidArticleItem {
  const titleKo = clean(out.titleKo, 200);
  if (!titleKo) throw new SummaryValidationError("EMPTY_TITLE");
  if (fixedTokens(input.title).some((t) => !titleKo.toLowerCase().includes(t.toLowerCase()))) throw new SummaryValidationError("TITLE_TOKEN_CHANGED");
  if (hedgeDropped(input.title, titleKo)) throw new SummaryValidationError("TITLE_HEDGE_DROPPED");
  const excerptKo = input.excerpt ? clean(out.excerptKo, 900) || null : null;

  if (!hasEnoughContent(input.excerpt, input.title)) return { titleKo, excerptKo, summary: null, summaryNote: "INSUFFICIENT_CONTENT" };
  if (!out.summarizable) return { titleKo, excerptKo, summary: null, summaryNote: "MODEL_INSUFFICIENT" };
  try {
    const summary = validateSummary(out);
    const source = `${input.title} ${input.excerpt ?? ""} ${input.publishedAt ?? ""}`;
    // 활용 아이디어(useCases)는 AI 제안으로 따로 표시하므로 대조에서 뺀다
    const factual = [summary.summaryKo, ...summary.keyPoints, summary.whyItMatters].join(" ");
    if (unsupportedNumbers(factual, source).length) throw new SummaryValidationError("UNSUPPORTED_NUMBER");
    if (hasStrongHedge(`${input.title} ${input.excerpt ?? ""}`) && !HEDGE_KO.test(`${summary.summaryKo} ${summary.keyPoints.join(" ")}`)) throw new SummaryValidationError("HEDGE_DROPPED");
    return { titleKo, excerptKo, summary, summaryNote: null };
  } catch (e) {
    if (e instanceof SummaryValidationError) return { titleKo, excerptKo, summary: null, summaryNote: e.message };
    throw e;
  }
}

/** 저장소 설명 → 한국어 1~2문장 */
export function validateRepoSummary(out: { summaryKo: string }): string {
  const summaryKo = clean(out.summaryKo, 240);
  const sentences = countSentences(summaryKo);
  if (sentences < 1 || sentences > 2) throw new SummaryValidationError(`REPO_SENTENCES_${sentences}`);
  return summaryKo;
}

/** 게임 설명 번역 검증: 비어 있지 않고 한글이 있어야 한다 */
export function validateGameDescription(out: { descriptionKo: string }): string {
  const text = clean(out.descriptionKo, 500);
  if (!text) throw new SummaryValidationError("EMPTY_GAME_DESCRIPTION");
  if (!/[가-힣]/.test(text)) throw new SummaryValidationError("NOT_KOREAN");
  return text;
}

/** 저장소 설명이 요약할 만큼 있는지(30자 이상) */
export const MIN_REPO_DESCRIPTION_CHARS = 30;
export function hasEnoughRepoDescription(description: string | null) {
  return !!description && description.trim().length >= MIN_REPO_DESCRIPTION_CHARS;
}

/**
 * 요약 근거가 될 발췌가 충분한지. 길이만이 아니라 정보량을 본다:
 * 80자 이상 + 서로 다른 단어 10개 이상(한국어는 글자 수로 대신) + 사이트 공통 문구가 아님 + 제목을 되풀이하는 수준이 아님.
 * 부족하면 번역만 하고 요약은 만들지 않는다
 */
export const MIN_EXCERPT_CHARS = 80;
const BOILERPLATE = /^(contribute to .{1,80} by creating an account on github|discussion on hacker news|sign (in|up)|log in|subscribe|javascript is (disabled|required)|we use cookies|this site uses cookies|page not found|access denied|just a moment|enable javascript|please enable)/i;
export function hasEnoughContent(excerpt: string | null, title = "") {
  if (!excerpt) return false;
  const text = excerpt.trim();
  if (text.length < MIN_EXCERPT_CHARS || BOILERPLATE.test(text)) return false;
  if (/[가-힣]/.test(text)) return text.replace(/\s/g, "").length >= 60;
  const words = (t: string) => new Set(t.toLowerCase().match(/[a-z0-9][a-z0-9.+#-]*/g) ?? []);
  const ws = words(text);
  if (ws.size < 10) return false;
  const titleWords = words(title);
  const fresh = [...ws].filter((w) => !titleWords.has(w)).length;
  return fresh >= 6;
}
