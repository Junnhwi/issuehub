import Link from "next/link";

export function LogoMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <rect x="0.5" y="0.5" width="23" height="23" rx="7" fill="var(--accent-soft)" stroke="var(--border-strong)" />
      <circle cx="12" cy="12" r="7" stroke="var(--accent)" strokeOpacity="0.35" />
      <circle cx="12" cy="12" r="3.5" stroke="var(--accent)" strokeOpacity="0.6" />
      <g>
        <path d="M12 12 L12 5 A7 7 0 0 1 18.06 8.5 Z" fill="var(--accent)" fillOpacity="0.28" />
        <line x1="12" y1="12" x2="12" y2="5" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <circle cx="12" cy="12" r="1.4" fill="var(--accent)" />
      <circle cx="15.6" cy="9.2" r="1" fill="var(--text)" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="IssueHub 홈">
      <LogoMark />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[15px] font-bold tracking-tight">
            Issue<span className="text-accent-fg">Hub</span>
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-muted">Discover · Understand</span>
        </span>
      )}
    </Link>
  );
}
