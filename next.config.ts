import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

/**
 * CSP: Next.js가 넣는 인라인 스크립트(RSC 데이터·테마 초기화) 때문에 script-src에 'unsafe-inline'이 필요하다.
 * 그래도 외부 스크립트·플러그인·프레임 삽입·폼 전송 대상·base 태그를 막는다. 이미지는 Steam 등 외부 https 허용.
 * shortcut: 인라인 스크립트를 nonce로 바꾸면 'unsafe-inline'을 뺄 수 있음(모든 페이지가 동적 렌더가 되어야 함)
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws: wss:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(dev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
