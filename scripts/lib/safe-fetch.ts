import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

/**
 * 외부에서 받은 임의 URL(HN 글 링크)의 앞부분을 안전하게 읽는다(SSRF 방어).
 * - http/https, 기본 포트(80/443)만
 * - 호스트를 DNS로 풀어 모든 주소가 공인 IP일 때만 연결. 연결할 때 쓰는 lookup 자체에서 검사하므로
 *   검사 후 다른 IP로 바뀌는 DNS rebinding도 막힌다(검사한 주소로만 접속)
 * - 리다이렉트는 직접 따라가며 매번 같은 검사(최대 3회)
 * - 시간 제한, 최대 바이트, Content-Type 확인
 */

const blocked = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.88.99.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const)
  blocked.addSubnet(net, prefix, "ipv4");
// IPv6: 전역 유니캐스트(2000::/3)만 허용하고, 그 안에서도 문서용·6to4·Teredo(내부 IPv4를 감쌀 수 있음)는 막는다
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [net, prefix] of [["2001::", 32], ["2001:db8::", 32], ["2002::", 16]] as const) blocked.addSubnet(net, prefix, "ipv6");

/** 공인 인터넷 주소인가(사설·루프백·링크 로컬·메타데이터·예약 대역이면 false) */
export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !blocked.check(address, "ipv4");
  if (family === 6) return globalV6.check(address, "ipv6") && !blocked.check(address, "ipv6");
  return false;
}

export class UnsafeUrlError extends Error {}

/** 접근해도 되는 URL인지(문법 수준). 호스트 이름의 실제 IP는 연결 시점에 lookup에서 검사한다 */
export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("BAD_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new UnsafeUrlError("BAD_PROTOCOL");
  if (url.username || url.password) throw new UnsafeUrlError("CREDENTIALS_IN_URL");
  if (url.port && url.port !== "80" && url.port !== "443") throw new UnsafeUrlError("BAD_PORT");
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) throw new UnsafeUrlError("BLOCKED_HOST");
  if (isIP(host) && !isPublicAddress(host)) throw new UnsafeUrlError("BLOCKED_IP");
  return url;
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** http.request용 lookup: 풀린 주소가 하나라도 공인 IP가 아니면 연결하지 않는다 */
function safeLookup(hostname: string, options: { all?: boolean }, cb: LookupCb) {
  dnsLookup(hostname, { all: true }, (err, addresses) => {
    if (err) return cb(err, "");
    if (!addresses.length || addresses.some((a) => !isPublicAddress(a.address))) {
      return cb(Object.assign(new UnsafeUrlError("BLOCKED_IP"), { code: "EBLOCKED" }), "");
    }
    if (options.all) return cb(null, addresses);
    cb(null, addresses[0].address, addresses[0].family);
  });
}

export interface SafeFetchOptions {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  /** 허용할 Content-Type 접두어(예: text/html) */
  accept?: string[];
  userAgent?: string;
  /** 다 읽기 전에 멈출 표시(예: </head>) */
  stopAt?: string;
}

/** 안전 검사를 거쳐 응답 본문 앞부분을 문자열로 읽는다. 조건에 맞지 않으면 null(예외는 던지지 않음) */
export async function safeFetchText(raw: string, opts: SafeFetchOptions = {}): Promise<string | null> {
  const { maxBytes = 65_536, timeoutMs = 6000, maxRedirects = 3, accept = ["text/html"], userAgent = "IssueHub-ingest/0.1", stopAt } = opts;
  const deadline = Date.now() + timeoutMs;
  let url: URL;
  try {
    url = checkUrl(raw);
  } catch {
    return null;
  }
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const res = await requestOnce(url, { deadline, maxBytes, accept, userAgent, stopAt }).catch(() => null);
    if (!res) return null;
    if (res.redirect) {
      try {
        url = checkUrl(new URL(res.redirect, url).toString());
      } catch {
        return null;
      }
      continue;
    }
    return res.body;
  }
  return null;
}

function requestOnce(url: URL, o: { deadline: number; maxBytes: number; accept: string[]; userAgent: string; stopAt?: string }): Promise<{ redirect?: string; body: string | null }> {
  const remaining = o.deadline - Date.now();
  if (remaining <= 0) return Promise.reject(new Error("TIMEOUT"));
  const lib = url.protocol === "https:" ? https : http;
  return new Promise((resolve, reject) => {
    const req = lib.get(url, { headers: { "User-Agent": o.userAgent, Accept: o.accept.join(", ") }, lookup: safeLookup as never, timeout: remaining }, (res) => {
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        return resolve({ redirect: res.headers.location, body: null });
      }
      const type = String(res.headers["content-type"] ?? "").toLowerCase();
      if (status < 200 || status >= 300 || !o.accept.some((a) => type.startsWith(a))) {
        res.destroy();
        return resolve({ body: null });
      }
      // 크기가 큰 응답이어도 앞부분(maxBytes)만 읽고 끊는다
      const chunks: Buffer[] = [];
      let size = 0;
      const finish = () => {
        res.destroy();
        resolve({ body: Buffer.concat(chunks).subarray(0, o.maxBytes).toString("utf8") });
      };
      res.on("data", (c: Buffer) => {
        chunks.push(c);
        size += c.length;
        if (size >= o.maxBytes || (o.stopAt && c.toString("latin1").includes(o.stopAt))) finish();
      });
      res.on("end", finish);
      res.on("error", reject);
    });
    req.on("timeout", () => req.destroy(new Error("TIMEOUT")));
    req.on("error", reject);
  });
}
