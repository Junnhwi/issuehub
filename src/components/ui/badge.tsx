import { cn } from "@/lib/utils";

export type Tone = "neutral" | "accent" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-elevated text-fg-2 border-line",
  accent: "bg-accent-soft text-accent-fg border-transparent",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
};

export function Badge({ tone = "neutral", className, children, title }: { tone?: Tone; className?: string; children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-xs font-medium leading-none",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
