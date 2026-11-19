import "server-only";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { toParamObject } from "@/lib/validation/params";

export function ok<T>(data: T, meta: { nextCursor?: string | null; asOf?: string | null } = {}, cacheSeconds = 60) {
  return NextResponse.json(
    { data, meta: { nextCursor: meta.nextCursor ?? null, asOf: meta.asOf ?? null } },
    { headers: { "Cache-Control": `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 5}` } },
  );
}

export function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

/** 쿼리 검증. 실패 시 400 응답을 반환 */
export function parseQuery<S extends z.ZodType>(schema: S, url: string): { ok: true; value: z.infer<S> } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(toParamObject(new URL(url).searchParams));
  if (result.success) return { ok: true, value: result.data };
  const issue = result.error.issues[0];
  return { ok: false, response: fail(400, "INVALID_PARAMS", `${issue.path.join(".") || "query"}: ${issue.message}`) };
}

/** 내부 오류는 로그에 코드만 남기고 응답에는 스택/세부 정보를 노출하지 않는다 */
export async function handle(fn: () => Promise<NextResponse>) {
  try {
    return await fn();
  } catch (e) {
    console.error("[api] internal error", e instanceof Error ? e.message.slice(0, 120) : "unknown");
    return fail(500, "INTERNAL_ERROR", "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
