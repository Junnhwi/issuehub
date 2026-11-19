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
 * 제목 번역이 비면 항목 전체를 다시 시도하도록 예외를 던진다.
 */
export function validateArticleItem(out: ArticleItemOutput, input: { excerpt: string | null }): ValidArticleItem {
  const titleKo = clean(out.titleKo, 200);
  if (!titleKo) throw new SummaryValidationError("EMPTY_TITLE");
  const excerptKo = input.excerpt ? clean(out.excerptKo, 900) || null : null;

  if (!hasEnoughContent(input.excerpt)) return { titleKo, excerptKo, summary: null, summaryNote: "INSUFFICIENT_CONTENT" };
  if (!out.summarizable) return { titleKo, excerptKo, summary: null, summaryNote: "MODEL_INSUFFICIENT" };
  try {
    return { titleKo, excerptKo, summary: validateSummary(out), summaryNote: null };
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

/** 저장소 설명이 요약할 만큼 있는지(30자 이상) */
export const MIN_REPO_DESCRIPTION_CHARS = 30;
export function hasEnoughRepoDescription(description: string | null) {
  return !!description && description.trim().length >= MIN_REPO_DESCRIPTION_CHARS;
}

/** 요약 근거가 될 텍스트가 충분한지(발췌 80자 이상). 부족하면 번역만 하고 요약은 만들지 않는다 */
export const MIN_EXCERPT_CHARS = 80;
export function hasEnoughContent(excerpt: string | null) {
  return !!excerpt && excerpt.trim().length >= MIN_EXCERPT_CHARS;
}
