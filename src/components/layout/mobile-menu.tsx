"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { TOPICS } from "@/config/topics";
import { Logo } from "./logo";
import { SidebarNav } from "./nav-links";

/** 모바일 전체 메뉴. 네이티브 <dialog>로 포커스 가두기·Esc 닫기를 처리한다. */
export function MobileMenu() {
  const ref = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const close = () => ref.current?.close();

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="grid size-11 place-items-center rounded-lg text-fg-2 hover:bg-hover md:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="size-5" aria-hidden />
      </button>
      <dialog
        ref={ref}
        aria-label="전체 메뉴"
        onClick={(e) => e.target === ref.current && close()}
        className="m-0 h-dvh max-h-none w-[min(320px,86vw)] max-w-none border-r border-line bg-surface p-0 text-fg backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col p-4">
          <div className="mb-6 flex items-center justify-between">
            <Logo />
            <button type="button" onClick={close} className="grid size-11 place-items-center rounded-lg text-fg-2 hover:bg-hover" aria-label="메뉴 닫기">
              <X className="size-5" aria-hidden />
            </button>
          </div>
          <SidebarNav expanded onNavigate={close} />
          <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-muted">Topics</p>
          <ul className="space-y-0.5">
            {TOPICS.map((t) => (
              <li key={t.slug}>
                <Link href={`/topics/${t.slug}`} onClick={close} className="flex h-11 items-center rounded-lg px-3 text-sm text-fg-2 hover:bg-hover hover:text-fg">
                  <span className="mr-2 text-muted">#</span>
                  {t.nameKo}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </dialog>
    </>
  );
}
