"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  const base = href.startsWith("/topics") ? "/topics" : href;
  return pathname === base || pathname.startsWith(`${base}/`) || (base === "/discover" && pathname.startsWith("/articles"));
}

/** 데스크톱(xl+): 아이콘+텍스트, 태블릿(md~xl): 아이콘만 */
export function SidebarNav({ onNavigate, expanded = false }: { onNavigate?: () => void; expanded?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="주요 메뉴">
      <ul className="space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={label}
                className={cn(
                  "group flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                  !expanded && "md:max-xl:justify-center md:max-xl:px-0",
                  active ? "bg-accent-soft text-accent-fg" : "text-fg-2 hover:bg-hover hover:text-fg",
                )}
              >
                <Icon className={cn("size-[18px] shrink-0", active ? "text-accent-fg" : "text-muted group-hover:text-fg")} aria-hidden />
                <span className={cn(!expanded && "md:max-xl:sr-only")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileTabBar() {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => i.href !== "/about");
  return (
    <nav aria-label="하단 메뉴" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="grid grid-cols-6">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-accent-fg" : "text-muted")}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
