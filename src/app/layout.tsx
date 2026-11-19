import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/layout/app-shell";
import { THEME_KEY } from "@/config/theme";
import { getDataMode } from "@/lib/env";
import "./globals.css";

const pretendard = localFont({
  src: "../../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "IssueHub — 기술의 흐름을 한눈에", template: "%s · IssueHub" },
  description: "개발 트렌드와 GitHub 주목 저장소를 모으고, 출처와 함께 한국어 요약을 제공하는 개발자 정보 허브",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

/** 페인트 전에 저장된 테마를 적용해 깜빡임 방지(기본: 다크) */
const themeInit = `try{var t=localStorage.getItem("${THEME_KEY}");document.documentElement.dataset.theme=t==="light"?"light":"dark"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" data-theme="dark" className={pretendard.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <AppShell mode={getDataMode()}>{children}</AppShell>
      </body>
    </html>
  );
}
