"use client";

import { Loader2, RotateCcw, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterField {
  name: string;
  label: string;
  type: "select" | "segment";
  options: FilterOption[];
  /** 기본값(이 값이면 URL에서 제거) */
  defaultValue: string;
}

/**
 * 검색어·필터 상태를 URL query string에 보존한다(공유·뒤로가기 가능).
 * 값이 바뀌면 cursor는 초기화된다.
 */
export function QueryFilters({ fields, searchPlaceholder, searchName = "q" }: { fields: FilterField[]; searchPlaceholder?: string; searchName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      const field = fields.find((f) => f.name === k);
      if (!v || v === field?.defaultValue) next.delete(k);
      else next.set(k, v);
    }
    next.delete("cursor");
    const qs = next.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };

  const active = [searchName, ...fields.map((f) => f.name)].some((k) => params.has(k));
  const q = params.get(searchName) ?? "";

  return (
    <div className="space-y-3" aria-busy={pending}>
      <div className="flex flex-col gap-2 sm:flex-row">
        {searchPlaceholder && (
          <form
            className="relative flex-1"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ [searchName]: String(new FormData(e.currentTarget).get(searchName) ?? "").trim() });
            }}
          >
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              key={q}
              name={searchName}
              type="search"
              defaultValue={q}
              maxLength={100}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-[15px] outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent md:h-10 md:text-sm"
            />
          </form>
        )}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          {fields
            .filter((f) => f.type === "select")
            .map((f) => (
              <label key={f.name} className="relative min-w-0">
                <span className="sr-only">{f.label}</span>
                <select
                  value={params.get(f.name) ?? f.defaultValue}
                  onChange={(e) => update({ [f.name]: e.target.value })}
                  className={cn(
                    "h-11 w-full appearance-none truncate rounded-xl border bg-surface pl-3 pr-8 text-sm outline-none transition-colors hover:border-line-strong focus:border-accent sm:w-auto md:h-10",
                    params.has(f.name) ? "border-accent/60 text-fg" : "border-line text-fg-2",
                  )}
                >
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {f.label}: {o.label}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </label>
            ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {fields
          .filter((f) => f.type === "segment")
          .map((f) => {
            const current = params.get(f.name) ?? f.defaultValue;
            return (
              <div key={f.name} role="radiogroup" aria-label={f.label} className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
                <span className="hidden px-2 text-xs font-medium text-muted sm:inline">{f.label}</span>
                {f.options.map((o) => {
                  const on = current === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => update({ [f.name]: o.value })}
                      className={cn(
                        "h-9 rounded-lg px-3 text-[13px] font-medium transition-colors md:h-8",
                        on ? "bg-elevated text-fg shadow-[inset_0_0_0_1px_var(--border-strong)]" : "text-muted hover:text-fg",
                      )}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            );
          })}
        {pending && <Loader2 className="size-4 animate-spin text-muted" aria-label="적용 중" />}
        {active && (
          <button
            type="button"
            onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-medium text-muted hover:text-fg"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            필터 초기화
          </button>
        )}
      </div>
    </div>
  );
}
