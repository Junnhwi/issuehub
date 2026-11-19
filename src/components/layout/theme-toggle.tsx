"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

type Theme = "dark" | "light";
import { THEME_KEY } from "@/config/theme";

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => obs.disconnect();
}
const getTheme = (): Theme => (document.documentElement.dataset.theme === "light" ? "light" : "dark");
const getServerTheme = (): Theme => "dark";

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getTheme, getServerTheme);
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch {
          /* 저장 불가 환경에서는 현재 세션에만 적용 */
        }
      }}
      className="grid size-11 shrink-0 place-items-center rounded-lg border border-line bg-surface text-fg-2 transition-colors hover:bg-hover hover:text-fg md:size-10"
      aria-label={next === "light" ? "라이트 테마로 전환" : "다크 테마로 전환"}
      title={next === "light" ? "라이트 테마" : "다크 테마"}
    >
      {theme === "dark" ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
