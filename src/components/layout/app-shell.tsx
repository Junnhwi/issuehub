import { FlaskConical, Radio } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { TOPICS } from "@/config/topics";
import type { DataMode } from "@/types";
import { Toaster } from "@/components/ui/toast";
import { Logo, LogoMark } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { MobileTabBar, SidebarNav } from "./nav-links";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";

function ModeIndicator({ mode }: { mode: DataMode }) {
  const demo = mode === "demo";
  return (
    <div className="rounded-xl border border-line bg-elevated/60 p-3 md:max-xl:p-2" title={demo ? "데모 데이터 모드" : "실데이터 모드"}>
      <div className="flex items-center gap-2 text-xs font-semibold md:max-xl:justify-center">
        {demo ? <FlaskConical className="size-4 text-warning" aria-hidden /> : <Radio className="size-4 text-success" aria-hidden />}
        <span className="md:max-xl:sr-only">{demo ? "데모 데이터 모드" : "실데이터 모드"}</span>
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted md:max-xl:hidden">
        {demo ? "가상의 예시 데이터입니다. 실제 뉴스가 아닙니다." : "Supabase에 수집된 데이터를 표시합니다."}
      </p>
    </div>
  );
}

function Sidebar({ mode }: { mode: DataMode }) {
  return (
    <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/40 md:flex md:w-[72px] xl:w-[236px]">
      <div className="flex h-16 items-center border-b border-line px-4 md:max-xl:justify-center md:max-xl:px-0">
        <span className="xl:hidden">
          <Link href="/" aria-label="IssueHub 홈" className="block rounded-lg">
            <LogoMark />
          </Link>
        </span>
        <span className="hidden xl:block">
          <Logo />
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav />
        <div className="mt-7 hidden xl:block">
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Topics</p>
          <ul className="space-y-0.5">
            {TOPICS.map((t) => (
              <li key={t.slug}>
                <Link href={`/topics/${t.slug}`} className="flex h-8 items-center rounded-md px-3 text-[13px] text-fg-2 transition-colors hover:bg-hover hover:text-fg">
                  <span className="mr-2.5 size-2 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
                  {t.nameKo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="p-3">
        <ModeIndicator mode={mode} />
      </div>
    </aside>
  );
}

function DemoBanner() {
  return (
    <div role="note" className="border-b border-line bg-warning-soft">
      <div className="mx-auto flex max-w-[1320px] items-start gap-2 px-4 py-2 text-[13px] text-fg-2 md:items-center md:px-6 xl:px-8">
        <FlaskConical className="mt-0.5 size-4 shrink-0 text-warning md:mt-0" aria-hidden />
        <p>
          <strong className="font-semibold text-warning">데모 데이터</strong> — 화면의 기사·저장소·수치는 UI 시연용 가상 데이터이며 실제 최신 뉴스가 아닙니다.{" "}
          <Link href="/about#data" className="font-medium text-accent-fg underline-offset-2 hover:underline">
            실데이터 연결 방법
          </Link>
        </p>
      </div>
    </div>
  );
}

export function AppShell({ mode, children }: { mode: DataMode; children: React.ReactNode }) {
  return (
    <>
      <a href="#main" className="sr-only-focusable fixed left-4 top-4 z-[60] rounded-lg bg-accent px-4 py-2 font-semibold text-on-accent">
        본문으로 건너뛰기
      </a>
      <div className="flex min-h-dvh">
        <Sidebar mode={mode} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 md:px-6 xl:px-8">
              <MobileMenu />
              <div className="md:hidden">
                <Logo />
              </div>
              <div className="hidden flex-1 md:block">
                <Suspense fallback={<div className="h-10 max-w-xl rounded-xl border border-line bg-surface" />}>
                  <SearchBox />
                </Suspense>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <ThemeToggle />
              </div>
            </div>
            <div className="px-4 pb-3 md:hidden">
              <Suspense fallback={<div className="h-11 rounded-xl border border-line bg-surface" />}>
                <SearchBox />
              </Suspense>
            </div>
          </header>
          {mode === "demo" && <DemoBanner />}
          <main id="main" tabIndex={-1} className="pb-mobile-nav mx-auto w-full max-w-[1320px] flex-1 px-4 py-6 outline-none md:px-6 md:py-8 xl:px-8">
            {children}
          </main>
          <footer className="pb-mobile-nav border-t border-line">
            <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 py-6 text-xs text-muted md:flex-row md:items-center md:justify-between md:px-6 xl:px-8">
              <p>모든 콘텐츠의 저작권은 원 출처에 있습니다. IssueHub는 제목·공개 메타데이터와 원문 링크만 제공합니다.</p>
              <p className="flex gap-4">
                <Link href="/about" className="hover:text-fg">서비스 소개 · 출처 정책</Link>
                <Link href="/api/health" className="hover:text-fg">API 상태</Link>
              </p>
            </div>
          </footer>
        </div>
      </div>
      <MobileTabBar />
      <Toaster />
    </>
  );
}
