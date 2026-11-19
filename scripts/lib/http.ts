/** 외부 API 호출 공통: timeout + 지수 backoff 재시도. 토큰/본문은 로그에 남기지 않는다. */

const UA = "IssueHub-ingest/0.1 (+https://github.com)";

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function fetchWithRetry(url: string, init: RequestInit = {}, { retries = 2, timeoutMs = 10_000 } = {}): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: { "User-Agent": UA, ...init.headers },
        signal: AbortSignal.timeout(timeoutMs),
        redirect: "follow",
      });
      if (res.ok) return res;
      // 4xx(429 제외)는 재시도해도 소용없음
      if (res.status < 500 && res.status !== 429) throw new HttpError(res.status, `HTTP_${res.status}`);
      lastError = new HttpError(res.status, `HTTP_${res.status}`);
    } catch (e) {
      if (e instanceof HttpError && e.status < 500 && e.status !== 429) throw e;
      lastError = e;
    }
    if (attempt < retries) await sleep(500 * 2 ** attempt + Math.random() * 250);
  }
  throw lastError instanceof Error ? lastError : new Error("FETCH_FAILED");
}

export async function fetchJson<T>(url: string, init?: RequestInit, opts?: { retries?: number; timeoutMs?: number }): Promise<T> {
  const res = await fetchWithRetry(url, init, opts);
  return (await res.json()) as T;
}

/** 동시 실행 수 제한 map */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

export function errorCode(e: unknown): string {
  if (e instanceof HttpError) return e.code;
  if (e instanceof Error && e.name === "TimeoutError") return "TIMEOUT";
  if (e instanceof Error) return e.message.slice(0, 60).replace(/[^\w:-]/g, "_");
  return "UNKNOWN";
}
