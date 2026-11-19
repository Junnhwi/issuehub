import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

if (typeof window !== "undefined") throw new Error("AI provider must run on the server only");

/*
 * 번역·요약에 쓰는 LLM 제공자. 수집기(서버/GitHub Actions)에서만 쓰며 키는 브라우저로 나가지 않는다.
 * - gemini: Google AI Studio 무료 티어 (기본값)
 * - anthropic: 유료, 선택
 */
export type ProviderName = "gemini" | "anthropic";
export interface ProviderConfig {
  name: ProviderName;
  model: string;
  /** 무료 티어 분당 요청 한도를 넘지 않도록 요청 사이에 두는 간격 */
  intervalMs: number;
}

export const DEFAULT_MODELS: Record<ProviderName, string> = {
  gemini: "gemini-3.5-flash-lite",
  anthropic: "claude-opus-5-5",
};

type Env = Record<string, string | undefined>;

/** 켜져 있고 키가 있는 제공자를 고른다. AI_PROVIDER로 명시하지 않으면 무료인 Gemini를 우선한다. */
export function resolveProvider(env: Env = process.env): ProviderConfig | null {
  if (env.AI_SUMMARIZATION_ENABLED !== "true") return null;
  const explicit = env.AI_PROVIDER === "gemini" || env.AI_PROVIDER === "anthropic" ? env.AI_PROVIDER : null;
  const name: ProviderName | null = explicit ?? (env.GEMINI_API_KEY ? "gemini" : env.ANTHROPIC_API_KEY ? "anthropic" : null);
  if (!name) return null;
  if (name === "gemini" && !env.GEMINI_API_KEY) return null;
  if (name === "anthropic" && !env.ANTHROPIC_API_KEY) return null;
  const model = (name === "gemini" ? env.GEMINI_MODEL : env.ANTHROPIC_MODEL) || DEFAULT_MODELS[name];
  const interval = Number(env.AI_REQUEST_INTERVAL_MS);
  return { name, model, intervalMs: Number.isFinite(interval) && interval >= 0 ? interval : name === "gemini" ? 4500 : 0 };
}

export class ProviderError extends Error {
  constructor(
    public code: string,
    public retryable: boolean,
  ) {
    super(code);
  }
}

let gemini: GoogleGenAI | null = null;
let anthropic: Anthropic | null = null;

async function callGemini<S extends z.ZodType>(model: string, system: string, user: string, schema: S): Promise<unknown> {
  gemini ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { timeout: 120_000 } });
  // Gemini의 responseJsonSchema는 JSON Schema 부분집합을 받는다. 메타 키는 뺀다.
  const jsonSchema = z.toJSONSchema(schema) as Record<string, unknown>;
  delete jsonSchema.$schema;
  try {
    const res = await gemini.models.generateContent({
      model,
      contents: user,
      config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: jsonSchema, temperature: 0.2 },
    });
    const text = res.text;
    if (!text) throw new ProviderError("EMPTY_RESPONSE", true);
    return JSON.parse(text);
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof SyntaxError) throw new ProviderError("PARSE_FAILED", true);
    if (e instanceof ApiError) {
      if (e.status === 429) throw new ProviderError("RATE_LIMIT", true);
      if (e.status === 401 || e.status === 403) throw new ProviderError("AUTH", false);
      if (e.status === 400 || e.status === 404) throw new ProviderError(`BAD_REQUEST_${e.status}`, false);
      throw new ProviderError(`API_${e.status}`, true);
    }
    throw new ProviderError("NETWORK", true);
  }
}

async function callAnthropic<S extends z.ZodType>(model: string, system: string, user: string, schema: S): Promise<unknown> {
  anthropic ??= new Anthropic({ maxRetries: 2, timeout: 180_000 });
  try {
    const res = await anthropic.beta.messages.parse({
      model,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low", format: betaZodOutputFormat(schema) },
      // 정책상 거절되면 서버가 대체 모델로 재시도
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (res.stop_reason === "refusal") throw new ProviderError("REFUSAL", false);
    if (res.stop_reason === "max_tokens") throw new ProviderError("MAX_TOKENS", true);
    if (!res.parsed_output) throw new ProviderError("PARSE_FAILED", true);
    return res.parsed_output;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw new ProviderError("AUTH", false);
    if (e instanceof Anthropic.BadRequestError) throw new ProviderError("BAD_REQUEST", false);
    if (e instanceof Anthropic.RateLimitError) throw new ProviderError("RATE_LIMIT", true);
    if (e instanceof Anthropic.APIError) throw new ProviderError(`API_${e.status ?? "ERR"}`, true);
    throw new ProviderError("NETWORK", true);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * 구조화된 JSON을 받아 zod로 검증한다. 일시 오류는 최대 2회 재시도(한도 초과는 더 길게 대기).
 * 영구 오류(인증, 잘못된 요청, 거절)는 바로 ProviderError를 던진다.
 */
export async function generateJson<S extends z.ZodType>(cfg: ProviderConfig, system: string, user: string, schema: S, attempts = 3): Promise<z.infer<S>> {
  let last: ProviderError = new ProviderError("NOT_RUN", false);
  for (let i = 0; i < attempts; i++) {
    try {
      const raw = cfg.name === "gemini" ? await callGemini(cfg.model, system, user, schema) : await callAnthropic(cfg.model, system, user, schema);
      const parsed = schema.safeParse(raw);
      if (parsed.success) return parsed.data;
      last = new ProviderError("SCHEMA_MISMATCH", true);
    } catch (e) {
      if (!(e instanceof ProviderError) || !e.retryable) throw e;
      last = e;
    }
    if (i < attempts - 1) await sleep(last.code === "RATE_LIMIT" ? 30_000 * (i + 1) : 2000 * 2 ** i);
  }
  throw last;
}
