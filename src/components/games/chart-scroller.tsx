"use client";

import { useEffect, useRef } from "react";

/**
 * 가로로 긴 그래프 스크롤 영역. 처음엔 최신(오른쪽 끝)을 보여 주고,
 * 그래프 위에서 마우스 휠을 굴리면 옆으로 이동한다(양 끝에 닿으면 페이지 스크롤로 넘긴다).
 */
export function ChartScroller({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || e.ctrlKey) return;
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const atStart = el.scrollLeft <= 0;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
      if ((d < 0 && atStart) || (d > 0 && atEnd)) return;
      e.preventDefault();
      el.scrollLeft += d;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="region"
      aria-label={label}
      className="min-w-0 flex-1 overflow-x-auto pb-2 outline-none [scrollbar-color:var(--border-strong)_transparent] focus-visible:ring-2 focus-visible:ring-focus"
    >
      {children}
    </div>
  );
}
