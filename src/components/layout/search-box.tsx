"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

export function SearchBox() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const ref = useRef<HTMLInputElement>(null);
  const current = pathname === "/discover" ? (params.get("q") ?? "") : "";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        ref.current?.focus();
        ref.current?.select();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      role="search"
      className="relative w-full max-w-xl"
      onSubmit={(e) => {
        e.preventDefault();
        const q = ref.current?.value.trim() ?? "";
        router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
        ref.current?.blur();
      }}
    >
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      <input
        ref={ref}
        key={current}
        type="search"
        name="q"
        defaultValue={current}
        maxLength={100}
        placeholder="이슈, 기술, 키워드 검색"
        aria-label="이슈 검색"
        className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-[15px] text-fg outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent sm:pr-16 md:h-10 md:text-sm"
      />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted sm:block">
        Ctrl K
      </kbd>
    </form>
  );
}
