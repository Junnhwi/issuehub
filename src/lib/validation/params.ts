import { z } from "zod";
import { TOPIC_SLUGS } from "@/config/topics";

const cursor = z.string().regex(/^\d{1,6}$/, "잘못된 cursor").optional();
const limit = z.coerce.number().int().min(1).max(50).default(20);
const q = z.string().trim().max(100).transform((v) => v || undefined).optional();
const slug = z.string().regex(/^[a-z0-9-]{1,40}$/).optional();

export const articleListSchema = z.object({
  q,
  topic: z.enum(TOPIC_SLUGS).optional(),
  source: slug,
  tier: z.enum(["official", "community", "independent"]).optional(),
  period: z.enum(["24h", "7d", "30d", "all"]).default("all"),
  sort: z.enum(["latest", "relevant", "popular"]).default("latest"),
  cursor,
  limit,
});
export type ArticleListParams = z.infer<typeof articleListSchema>;

export const repoListSchema = z.object({
  q,
  language: z.string().trim().max(40).transform((v) => v || undefined).optional(),
  topic: z.enum(TOPIC_SLUGS).optional(),
  sort: z.enum(["stars", "updated", "growth"]).default("stars"),
  cursor,
  limit,
});
export type RepoListParams = z.infer<typeof repoListSchema>;

export const uuidSchema = z.uuid();

/** URLSearchParams 또는 Next searchParams 객체를 평범한 객체로. 빈 문자열은 제거. */
export function toParamObject(input: URLSearchParams | Record<string, string | string[] | undefined>) {
  const entries = input instanceof URLSearchParams ? [...input.entries()] : Object.entries(input);
  const out: Record<string, string> = {};
  for (const [k, v] of entries) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value) out[k] = value;
  }
  return out;
}

/** 페이지용: 잘못된 값은 버리고 기본값으로 대체(UI는 400 대신 관대하게) */
export function parseLenient<S extends z.ZodObject>(schema: S, raw: Record<string, string>): z.infer<S> {
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    const field = schema.shape[k] as z.ZodType | undefined;
    if (field && field.safeParse(v).success) clean[k] = v;
  }
  return schema.parse(clean);
}
