import { z } from "zod";
import { TOPIC_SLUGS } from "@/config/topics";
import { stripHtml } from "@/lib/ingestion/normalize";

/** 모델에 요청하는 구조(structured output). 길이 등 세부 규칙은 validateSummary에서 검증한다. */
export const SummaryOutputSchema = z.object({
  insufficient: z.boolean().describe("제공된 정보만으로 요약 근거가 부족하면 true"),
  titleKo: z.string(),
  summaryKo: z.string(),
  keyPoints: z.array(z.string()),
  whyItMatters: z.string(),
  useCases: z.array(z.string()),
  caveats: z.string(),
  topics: z.array(z.string()),
  confidenceNotes: z.string(),
});
export type SummaryOutput = z.infer<typeof SummaryOutputSchema>;

export interface ValidSummary {
  titleKo: string;
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

/**
 * AI 결과 검증 및 정제: HTML 제거, 길이 제한, 개수 제한, 등록된 토픽만 허용.
 * 규칙 위반 시 SummaryValidationError (재시도 대상).
 */
export function validateSummary(out: SummaryOutput): ValidSummary {
  const summaryKo = clean(out.summaryKo, 700);
  const sentences = countSentences(summaryKo);
  if (sentences < 2 || sentences > 4) throw new SummaryValidationError(`SUMMARY_SENTENCES_${sentences}`);
  const titleKo = clean(out.titleKo, 200);
  if (!titleKo) throw new SummaryValidationError("EMPTY_TITLE");
  const whyItMatters = clean(out.whyItMatters, 400);
  if (!whyItMatters) throw new SummaryValidationError("EMPTY_WHY");
  return {
    titleKo,
    summaryKo,
    keyPoints: out.keyPoints.map((p) => clean(p, 200)).filter(Boolean).slice(0, 4),
    whyItMatters,
    useCases: out.useCases.map((u) => clean(u, 200)).filter(Boolean).slice(0, 3),
    caveats: clean(out.caveats, 400),
    topics: [...new Set(out.topics)].filter((t) => (TOPIC_SLUGS as string[]).includes(t)).slice(0, 4),
    confidenceNotes: clean(out.confidenceNotes, 400),
  };
}

/** 저장소 설명 → 한국어 1~2문장 요약 */
export const RepoSummaryOutputSchema = z.object({
  insufficient: z.boolean().describe("설명만으로 무엇을 하는 저장소인지 알 수 없으면 true"),
  summaryKo: z.string(),
});
export type RepoSummaryOutput = z.infer<typeof RepoSummaryOutputSchema>;

export function validateRepoSummary(out: RepoSummaryOutput): string {
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

/** 요약 근거가 될 텍스트가 충분한지(발췌 80자 이상). 부족하면 AI를 호출하지 않고 skipped 처리 */
export const MIN_EXCERPT_CHARS = 80;
export function hasEnoughContent(excerpt: string | null) {
  return !!excerpt && excerpt.trim().length >= MIN_EXCERPT_CHARS;
}
